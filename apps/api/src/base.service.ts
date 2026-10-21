import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PaginationData } from './common/interfaces/pagination-data.interface';
import { PaginationResponse } from './common/interfaces/pagination-response.interface';

@Injectable()
export class BaseService {
  public paginate(
    items: any[],
    totalCount: number,
    pagination: PaginationData,
  ): PaginationResponse {
    const lastPage = Math.ceil(totalCount / pagination.take);

    return {
      items: items,
      currentPage: pagination.currentPage,
      lastPage,
      itemsPerPage: pagination.take,
      pageItems: items.length,
      total: totalCount,
      timestamp: DateTime.now().toFormat('yyyy-LL-dd, HH:mm:ss'),
    };
  }
}
