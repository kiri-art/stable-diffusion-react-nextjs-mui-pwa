import { ObjectId as MongoObjectId } from "mongodb";
import { ObjectId } from "../../api-lib/objectId";

type NodeCol<T> = Omit<T, "_id"> & { _id: ObjectId | MongoObjectId };

export default NodeCol;
