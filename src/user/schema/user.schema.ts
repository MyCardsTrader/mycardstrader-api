import { Document, Schema as SchemaNative } from 'mongoose';
import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';

export type Location = {
  type: 'Point';
  coordinates: [Number, Number];
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
  location: Location;

  @Prop({
    required: false,
  })
  country: string;

  @Prop({
    required: true,
    default: 0,
  })
  holdTreasures?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
