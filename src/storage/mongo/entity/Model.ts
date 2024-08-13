import { Entity, ObjectId, ObjectIdColumn, Column } from 'typeorm';

@Entity()
export class Model {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  path: string;
}
