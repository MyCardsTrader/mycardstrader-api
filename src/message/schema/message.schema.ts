import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type MessageDocument = Message & Document;

@Schema({
  timestamps: true,
})
export class Message {
  @Prop({
    required: true,
  })
  user: string;

  @Prop({
    required: true
  })
  trade: string;

  @Prop({
    required: true,
  })
  content: string;

  @Prop({
    required: true,
    default: false,
  })
  viewed: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);