import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { HttpException, HttpService, Injectable } from '@nestjs/common';

import { SetDocument } from './schema/set.schema';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class SetService {
  constructor(
    @InjectModel('Set') private readonly setModel: Model<SetDocument>,
    private readonly httpService: HttpService,
  ) { }
  async findAll(): Promise<any> {
    try {
      return await this.setModel.find({}).exec();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async getSets(): Promise<void> {
    const sets = await this.findAll();
    const scryfallSets = await lastValueFrom(this.httpService.get('https://api.scryfall.com/sets'));
    const newSets = scryfallSets.data.data.map( set => {
      console.log("[SET:]", set);
      return {
        name: set.name,
        code: set.code,
        icon_svg_uri: set.icon_svg_uri,
      };
    });
    const newSetsToAdd = newSets.filter( set => sets.map(set => set.code).indexOf(set.code) === -1);
    try {
      if (newSetsToAdd.length > 0) {
        this.setModel.insertMany(newSetsToAdd);
      }
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }
};
