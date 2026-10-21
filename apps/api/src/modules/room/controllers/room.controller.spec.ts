import { Test, TestingModule } from '@nestjs/testing';
import { GuestAuthGuard } from 'src/common/guards/guest-auth.guard';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { CreateRoomDto } from '../dto/create-room.dto';
import { RoomService } from '../services/room.service';
import { RoomController } from './room.controller';

describe('RoomController', () => {
  let controller: RoomController;

  const mockRoomService = {
    create: jest.fn(),
    getByCode: jest.fn(),
    listMatches: jest.fn(),
  };

  const guest = { id: '4', nickname: 'Quiet Lynx' } as GuestSession;
  const dto: CreateRoomDto = {
    language_code: 'rw',
    difficulty: WordDifficulty.EASY,
    max_players: 8,
  };
  const room = { id: 101, code: 'AB7K2QMN', status: 'waiting' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomController],
      providers: [{ provide: RoomService, useValue: mockRoomService }],
    })
      .overrideGuard(GuestAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(RoomController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a room for the authenticated guest', async () => {
    mockRoomService.create.mockResolvedValue(room);

    const result = await controller.create(dto, { guest } as never);

    expect(mockRoomService.create).toHaveBeenCalledWith(guest, dto);
    expect(result).toEqual(room);
  });

  it('returns a room by code', async () => {
    mockRoomService.getByCode.mockResolvedValue(room);

    const result = await controller.getByCode('AB7K2QMN');

    expect(mockRoomService.getByCode).toHaveBeenCalledWith('AB7K2QMN');
    expect(result).toEqual(room);
  });

  it('returns paginated matches for a room', async () => {
    const matches = { items: [], currentPage: 1, total: 0 };
    const query = { page: 1, limit: 20 };
    mockRoomService.listMatches.mockResolvedValue(matches);

    const result = await controller.listMatches('AB7K2QMN', query);

    expect(mockRoomService.listMatches).toHaveBeenCalledWith('AB7K2QMN', query);
    expect(result).toEqual(matches);
  });
});
