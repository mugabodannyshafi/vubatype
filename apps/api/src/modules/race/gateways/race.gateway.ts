import {
  HttpException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { RoomStatus } from 'src/common/enums/RoomStatus';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { RoomService } from 'src/modules/room/services/room.service';
import { RaceService } from '../services/race.service';
import { RealtimeTicketService } from '../services/realtime-ticket.service';

export const HOST_DISCONNECT_GRACE_MS = 15_000;
export const EMPTY_ROOM_GRACE_MS = 60_000;
const MAX_TYPED_TEXT_LENGTH = 4000;

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RaceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RaceGateway.name);
  private readonly socketsByGuest = new Map<string, string>();
  private readonly roomByGuest = new Map<string, string>();
  private readonly seats = new Map<string, Map<string, string>>();
  private readonly hostGrace = new Map<string, NodeJS.Timeout>();
  private readonly emptyGrace = new Map<string, NodeJS.Timeout>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tickets: RealtimeTicketService,
    private readonly raceService: RaceService,
    private readonly roomService: RoomService,
    @InjectRepository(GuestSession)
    private readonly guests: Repository<GuestSession>,
  ) {}

  onModuleInit(): void {
    this.raceService.bindEmitter((code, event, payload) => {
      this.server.to(this.channel(code)).emit(event, payload);
      if (event === 'race:countdown' || event === 'race:started' || event === 'race:finished') {
        void this.broadcastState(code);
      }
    });
  }

  onModuleDestroy(): void {
    for (const timer of this.hostGrace.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.emptyGrace.values()) {
      clearTimeout(timer);
    }
  }

  afterInit(server: Server): void {
    server.use((socket: Socket, next) => {
      void this.authenticate(socket)
        .then(() => next())
        .catch((error: unknown) => {
          this.logger.warn(`Rejected race socket: ${this.errorMessage(error)}`);
          next(error instanceof Error ? error : new Error('Guest session is missing or invalid'));
        });
    });
  }

  handleConnection(client: Socket): void {
    const guest = this.guestOf(client);
    if (!guest) {
      client.disconnect();
      return;
    }

    const guestKey = String(guest.id);
    const previousId = this.socketsByGuest.get(guestKey);
    this.socketsByGuest.set(guestKey, client.id);
    if (previousId && previousId !== client.id) {
      this.server.sockets.sockets.get(previousId)?.disconnect(true);
    }
  }

  private async authenticate(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token;
    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('Guest session is missing or invalid');
    }

    const guestId = this.tickets.verify(token);
    const guest = await this.guests.findOne({
      where: { id: guestId },
      relations: { avatar: true, user: true },
    });
    if (!guest || guest.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('Guest session is missing or invalid');
    }

    client.data.guest = guest;
  }

  handleDisconnect(client: Socket): void {
    const guest = this.guestOf(client);
    if (!guest) {
      return;
    }

    const guestKey = String(guest.id);
    if (this.socketsByGuest.get(guestKey) === client.id) {
      this.socketsByGuest.delete(guestKey);
    }

    const code = this.roomByGuest.get(guestKey);
    if (!code || this.seats.get(code)?.get(guestKey) !== client.id) {
      return;
    }

    this.releaseSeat(guestKey, code, client.id);
    this.raceService.markDisconnected(guestKey);
    void this.afterDisconnect(code);
  }

  @SubscribeMessage('room:join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { code?: string }) {
    await this.guard(client, async () => {
      const guest = this.requireGuest(client);
      const room = await this.roomService.getByCode(this.requireCode(body));
      await this.enter(client, guest, room.code);
    });
  }

  @SubscribeMessage('room:leave')
  async leave(@ConnectedSocket() client: Socket, @MessageBody() body: { code?: string }) {
    await this.guard(client, async () => {
      const guest = this.requireGuest(client);
      const room = await this.roomService.getByCode(this.requireCode(body));
      await this.roomService.leave(guest, room.code);
      this.releaseSeat(String(guest.id), room.code, client.id);
      await client.leave(this.channel(room.code));
      await this.afterDisconnect(room.code);
    });
  }

  @SubscribeMessage('room:ready')
  async ready(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code?: string; ready?: boolean },
  ) {
    await this.guard(client, async () => {
      const guest = this.requireGuest(client);
      const room = await this.roomService.getByCode(this.requireCode(body));
      await this.roomService.setReady(guest, room.code, Boolean(body?.ready));
      await this.broadcastState(room.code);
    });
  }

  @SubscribeMessage('race:start')
  async start(@ConnectedSocket() client: Socket, @MessageBody() body: { code?: string }) {
    await this.guard(client, async () => {
      const guest = this.requireGuest(client);
      const room = await this.roomService.getByCode(this.requireCode(body));
      await this.raceService.start(guest, room.code, this.connectedGuestIds(room.code));
    });
  }

  @SubscribeMessage('race:progress')
  async progress(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code?: string; typed_text?: string },
  ) {
    await this.guard(client, async () => {
      const guest = this.requireGuest(client);
      if (typeof body?.typed_text !== 'string' || body.typed_text.length > MAX_TYPED_TEXT_LENGTH) {
        client.emit('room:error', { message: 'Progress update is invalid' });
        return;
      }
      const seated = this.roomByGuest.get(String(guest.id));
      const requested = this.requireCode(body).trim().toUpperCase();
      if (!seated || seated !== requested) {
        throw new HttpException('You are not in this room', 403);
      }
      await this.raceService.progress(guest, seated, body.typed_text);
    });
  }

  @SubscribeMessage('race:rematch')
  async rematch(@ConnectedSocket() client: Socket, @MessageBody() body: { code?: string }) {
    await this.guard(client, async () => {
      const guest = this.requireGuest(client);
      const room = await this.roomService.getByCode(this.requireCode(body));
      await this.raceService.rematch(guest, room.code);
      await this.broadcastState(room.code);
    });
  }

  private async enter(client: Socket, guest: GuestSession, code: string): Promise<void> {
    const guestKey = String(guest.id);
    const previous = this.roomByGuest.get(guestKey);
    if (previous && previous !== code) {
      const sync = this.raceService.syncFor(previous, guestKey);
      if (sync && sync.phase !== 'finished') {
        throw new HttpException('Finish your current race before joining another room', 409);
      }
      const previousRoom = await this.roomService.getByCode(previous);
      this.releaseSeat(guestKey, previous, client.id);
      await client.leave(this.channel(previous));
      if (previousRoom.status === RoomStatus.WAITING) {
        await this.roomService.leave(guest, previous);
      }
      await this.broadcastState(previous);
    }

    await this.roomService.join(guest, code);
    this.seat(code, guestKey, client.id);
    await client.join(this.channel(code));
    this.clearEmpty(code);
    this.clearHostGrace(code);
    this.raceService.markReconnected(guestKey);
    await this.broadcastState(code);
  }

  private async broadcastState(code: string): Promise<void> {
    let room: Awaited<ReturnType<RoomService['getByCode']>>;
    try {
      room = await this.roomService.getByCode(code);
    } catch {
      return;
    }

    const connected = new Set(this.connectedGuestIds(code).map((id) => Number(id)));
    const players = room.players.map((player) => ({
      ...player,
      connected: connected.has(player.guest.id),
    }));
    const snapshot = { ...room, players };
    const sockets = await this.server.in(this.channel(code)).fetchSockets();
    for (const socket of sockets) {
      const guest = socket.data.guest as GuestSession | undefined;
      if (!guest) {
        continue;
      }
      const you = players.find((player) => player.guest.id === Number(guest.id)) ?? null;
      socket.emit('room:state', {
        room: snapshot,
        you: you ? { id: you.guest.id, is_host: you.is_host, is_ready: you.is_ready } : null,
        can_start: this.roomService.canStart(room, this.connectedGuestIds(code), String(guest.id)),
        sync: this.raceService.syncFor(code, String(guest.id)),
      });
    }
  }

  private async afterDisconnect(code: string): Promise<void> {
    await this.broadcastState(code);
    let room: Awaited<ReturnType<RoomService['getByCode']>>;
    try {
      room = await this.roomService.getByCode(code);
    } catch {
      return;
    }

    const connected = this.connectedGuestIds(code);
    if (connected.length === 0) {
      this.clearHostGrace(code);
      if (room.status === RoomStatus.WAITING || room.status === RoomStatus.FINISHED) {
        this.scheduleEmpty(code);
      }
      return;
    }

    this.clearEmpty(code);
    if (room.status === RoomStatus.WAITING && !connected.includes(String(room.host.id))) {
      this.scheduleHostGrace(code);
    }
  }

  private scheduleHostGrace(code: string): void {
    if (this.hostGrace.has(code)) {
      return;
    }
    this.hostGrace.set(
      code,
      setTimeout(() => {
        this.hostGrace.delete(code);
        void this.roomService
          .transferHost(code, this.connectedGuestIds(code))
          .then(() => this.broadcastState(code))
          .catch((error: unknown) => {
            this.logger.warn(`Could not transfer host for ${code}: ${this.errorMessage(error)}`);
          });
      }, HOST_DISCONNECT_GRACE_MS),
    );
  }

  private scheduleEmpty(code: string): void {
    if (this.emptyGrace.has(code)) {
      return;
    }
    this.emptyGrace.set(
      code,
      setTimeout(() => {
        this.emptyGrace.delete(code);
        if (this.connectedGuestIds(code).length > 0) {
          return;
        }
        void this.roomService
          .expireIfUnoccupied(code)
          .then(() => {
            this.server.to(this.channel(code)).emit('room:closed', { code });
          })
          .catch((error: unknown) => {
            this.logger.warn(`Could not expire room ${code}: ${this.errorMessage(error)}`);
          });
      }, EMPTY_ROOM_GRACE_MS),
    );
  }

  private clearHostGrace(code: string): void {
    const timer = this.hostGrace.get(code);
    if (timer) {
      clearTimeout(timer);
      this.hostGrace.delete(code);
    }
  }

  private clearEmpty(code: string): void {
    const timer = this.emptyGrace.get(code);
    if (timer) {
      clearTimeout(timer);
      this.emptyGrace.delete(code);
    }
  }

  private seat(code: string, guestId: string, socketId: string): void {
    let seats = this.seats.get(code);
    if (!seats) {
      seats = new Map();
      this.seats.set(code, seats);
    }
    seats.set(guestId, socketId);
    this.roomByGuest.set(guestId, code);
  }

  private releaseSeat(guestId: string, code: string, socketId: string): void {
    const seats = this.seats.get(code);
    if (seats?.get(guestId) !== socketId) {
      return;
    }
    seats.delete(guestId);
    if (this.roomByGuest.get(guestId) === code) {
      this.roomByGuest.delete(guestId);
    }
  }

  private connectedGuestIds(code: string): string[] {
    return [...(this.seats.get(code)?.keys() ?? [])];
  }

  private channel(code: string): string {
    return `room:${code}`;
  }

  private requireGuest(client: Socket): GuestSession {
    const guest = this.guestOf(client);
    if (!guest) {
      throw new HttpException('Guest session is missing or invalid', 401);
    }
    return guest;
  }

  private guestOf(client: Socket): GuestSession | null {
    const guest = client.data?.guest as GuestSession | undefined;
    return guest ?? null;
  }

  private requireCode(body: { code?: string } | undefined): string {
    if (!body || typeof body.code !== 'string' || !body.code.trim()) {
      throw new HttpException('Room code is required', 400);
    }
    return body.code;
  }

  private async guard(client: Socket, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      client.emit('room:error', { message: this.errorMessage(error) });
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && response && 'message' in response) {
        const message = (response as { message?: unknown }).message;
        if (typeof message === 'string') {
          return message;
        }
        if (Array.isArray(message)) {
          return message.map(String).join(' ');
        }
      }
      return error.message;
    }
    return 'Something went wrong';
  }
}
