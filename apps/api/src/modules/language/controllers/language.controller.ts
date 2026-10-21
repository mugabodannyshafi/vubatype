import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LanguageService } from '../services/language.service';

@ApiTags('Languages')
@Controller('languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  @ApiOperation({ summary: 'Get available typing languages' })
  @ApiResponse({ status: 200, description: 'Available typing languages retrieved successfully' })
  findAvailable() {
    return this.languageService.findAvailable();
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get language information' })
  @ApiResponse({ status: 200, description: 'Language information retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  findByCode(@Param('code') code: string) {
    return this.languageService.findAvailableByCode(code);
  }
}
