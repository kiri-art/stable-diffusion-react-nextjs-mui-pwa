import { ObjectId } from "mongodb";

type NodeCol<T> = Omit<T, "_id"> & { _id: ObjectId };

export default NodeCol;
