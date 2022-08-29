import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { HttpException, Injectable } from '@nestjs/common';
import { User, UserDocument } from '../user/schema/user.schema';

@Injectable()
export class SearchService {

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async getCardsNearMe(
    lat: string,
    lng: string,
    distanceKm: string,
    country: string,
  ): Promise<any> {
    try {
      const distance = distanceKm ? parseInt(distanceKm) * 1000: 10000;
      
      const geoNear = {
        $geoNear: {
          near: {
            type: 'Point', 
            coordinates: [
              parseFloat(lat), parseFloat(lng)
            ]
          },
          query: {}, 
          distanceField: 'distance', 
          maxDistance: distance, 
          spherical: true
        }
      };
      if (country) {
        geoNear.$geoNear.query = {
          country,
        };
      } 

      const cardsResult = await this.userModel.aggregate([
        geoNear, {
          $addFields: {
            userId: {
              $toString: '$_id'
            }
          }
        }, {
          $lookup: {
            from: 'cards', 
            localField: 'userId', 
            foreignField: 'user', 
            as: 'cards'
          }
        }, {
          $unwind: {
            path: '$cards'
          }
        },{
          $match: {
            distance: { $gt: 0}
          }
        },{
          $project: {
            _id: 0, 
            userId: 1, 
            email: 1, 
            distance: 1, 
            cardName: '$cards.name', 
            image_uri: '$cards.image_uri', 
            grading: '$cards.grading', 
            cardId: {
              $toString: '$cards._id'
            }
          }
        }
      ]);
      return cardsResult;
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async findCards(): Promise<any> {
    return [];
  }
}
