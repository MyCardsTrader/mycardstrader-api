import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
    default: 0,
  })
  holdTreasures?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
