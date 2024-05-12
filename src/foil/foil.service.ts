import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { HttpException, Injectable } from '@nestjs/common';

import { FoilDocument } from './schema/foil.schema';

@Injectable()
export class FoilService {
    constructor(@InjectModel('Foil') private readonly foilModel: Model<FoilDocument>) { }

    async getFoils(): Promise<string[]> {
        try {
            const foilDoc = await this.foilModel.findOne({}).exec();
            return foilDoc.treatments;
        } catch (error) {
            throw new HttpException(error.message, 520);
        }
    }
}
