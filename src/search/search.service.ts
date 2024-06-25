import { Model, PipelineStage } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { HttpException, Injectable } from '@nestjs/common';
import { User, UserDocument } from '../user/schema/user.schema';

@Injectable()
export class SearchService {

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  getGeoNearStage(
    lat: string,
    lng: string,
    distanceKm?: string,
    country?: string,
    userId?: string,
    name?: string,
    type?: string,
    set?: string,
    ): PipelineStage {
    const distance = distanceKm ? parseInt(distanceKm) * 1000: 10000;

    const geoNear = {
      $geoNear: {
        near: {
          type: "Point", 
          coordinates: [
            parseFloat(lat), parseFloat(lng)
          ]
        },
        query: {

        },
        distanceMultiplier: 0.001,
        distanceField: 'distance', 
        maxDistance: distance, 
        spherical: true
      }
    };
    if (country) {
      geoNear.$geoNear.query['country'] = country;
    };
    if (name) {
      geoNear.$geoNear.query['name'] = name;
    };
    if (type) {
      geoNear.$geoNear.query['type'] = type;
    }
    if (set) {
      geoNear.$geoNear.query['set'] = set;
    }
    if (userId) {
      geoNear.$geoNear.query['_id'] = { $ne: userId };
    }
    return geoNear as PipelineStage;
  }

  async getCardsNearMe(
    lat: string,
    lng: string,
    distanceKm: string,
    country: string,
    userId: string = '',
  ): Promise<any> {
    try {
      const cardsResult = await this.userModel.aggregate([
        this.getGeoNearStage(lat, lng, distanceKm, country),
        { $sort: { distance: 1 } },
        {
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
            as: 'cards',
          }
        }, {
          $unwind: {
            path: '$cards'
          }
        }, {
          $match: {
            distance: { $gt: 0},
            userId: { $ne: userId },
            'cards.availability': 'available'
          }
        }, {
          $project: {
            _id: 0, 
            userId: 1, 
            email: 1, 
            distance: 1, 
            cardName: '$cards.name', 
            image_uris: '$cards.image_uris', 
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

  async findCards(
    lat: string,
    lng: string,
    country: string,
    name: string,
    type: string,
    set: string,
  ): Promise<any> {
    try {
      const cardsResult = await this.userModel.aggregate([
        this.getGeoNearStage(lat, lng, country, name, type, set),{
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
        }, {
          $match: {
            distance: { $gt: 0}
          }
        }, {
          $project: {
            _id: 0, 
            userId: 1, 
            email: 0, 
            distance: 1, 
            cardName: '$cards.name', 
            image_uris: '$cards.image_uris', 
            grading: '$cards.grading', 
            cardId: {
              $toString: '$cards._id'
            }
          }
        }
      ]);
    } catch(error) {
      throw new HttpException(error.message, 520);
    }
  }
}
