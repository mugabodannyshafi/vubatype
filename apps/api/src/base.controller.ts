import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

@Injectable()
export abstract class BaseController {
  protected successMessageResponse(
    message: string,
    additionalData?: object,
  ): {
    message: string;
    timestamp: string;
  } {
    const timestamp = DateTime.now().toFormat('yyyy-LL-dd, HH:mm:ss');

    if (additionalData !== undefined) {
      return {
        ...additionalData,
        message,
        timestamp,
      };
    }

    return {
      message,
      timestamp,
    };
  }
}
