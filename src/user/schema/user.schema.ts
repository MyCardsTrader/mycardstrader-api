import { Document, Schema as SchemaNative } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type UserLocation = {
  type: 'Point';
  coordinates: [Number, Number];
}

export enum CountryEnum {
  DE = 'DE',
  AT = 'AT',
  BE = 'BE',
  BG = 'BG',
  CY = 'CY',
  HR = 'HR',
  DK = 'DK',
  ES = 'ES',
  EE = 'EE',
  FI = 'FI',
  FR = 'FR',
  GR = 'GR',
  HU = 'HU',
  IE = 'IE',
  IT = 'IT',
  LV = 'LV',
  LT = 'LT',
  LU = 'LU',
  MT = 'MT',
  NL = 'NL',
  PL = 'PL',
  PT = 'PT',
  CZ = 'CZ',
  RO = 'RO',
  SK = 'SK',
  SI = 'SI',
  SE = 'SE',
}

export type UserDocument = User & Document;
@Schema({
  timestamps: true,
})
export class User {

  @Prop({
    required: true,
    unique: true,
  })
  email: string;

  @Prop({
    required: false,
  })
  password?: string;

  @Prop({
    required: false,
  })
  salt?: string;
  
  @Prop({
    required: true,
    type: SchemaNative.Types.Mixed,
    index: '2dsphere',
  })
  location: UserLocation;
  
  @Prop({
    required: true,
    type: String,
  })
  country: string;

  @Prop({
    required: true,
    type: Number,
    default: 0,
  })
  spentCoins?: number;

  @Prop({
    required: true,
    default: 0,
  })
  availableCoins?: number;
  
  @Prop({
    required: true,
    type: Number,
    default: 0,
  })
  holdCoins?: number;

  @Prop({
    required: false,
    type: String,
  })
  verify?: string | null;

  @Prop({
    required: false,
    type: String,
  })
  resetToken?: string;

  @Prop({
    required: false,
    type: [String],
  })
  usedPromocode?: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
