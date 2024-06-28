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
    default: 0,
  })
  availableTreasures?: number;

  @Prop({
    required: true,
    type: SchemaNative.Types.Mixed,
    index: '2dsphere',
  })
  location: UserLocation;

  @Prop({
    required: false,
  })
  country: string;

  @Prop({
    required: true,
    default: 0,
  })
  holdTreasures?: number;

  @Prop({
    required: false,
  })
  verify?: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
