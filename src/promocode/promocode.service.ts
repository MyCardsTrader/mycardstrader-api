import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';

import { PromocodeDocument } from './schema/promocode.schema';

@Injectable()
export class PromocodeService {
    constructor(@InjectModel('Promocode') private readonly promocodeModel: Model<PromocodeDocument>) { }

    async getPromocode(code: string): Promise<PromocodeDocument> {
        try {
            const promocode = await this.promocodeModel.findOne({ code }).exec();
            if (!promocode) {
                throw new Error('Promocode not found');
            }
            return promocode;
        } catch (error) {
            if (error.message === 'Promocode not found') {
                throw new NotFoundException(error.message);
            } else {
                throw new HttpException(error.message, 520);   
            }
        }
    }
}
