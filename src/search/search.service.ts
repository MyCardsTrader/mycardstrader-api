import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchService {

  async getCardsNearMe(
    lat: number,
    lng:number,
    distance: number,
    country: string,
  ): Promise<any> {
    console.log(`
      lat: ${lat},
      lng: ${lng},
      distance: ${distance},
      country: ${country}
    `);
    return [];
  }

  async findCards(): Promise<any> {
    return [];
  }
}
