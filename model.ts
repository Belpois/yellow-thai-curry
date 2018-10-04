export interface Dictionary<T extends any> {
    [index: string]: T
}

export interface Map2D {
    data: string;
    stride: number;
    arr: Map2DCoordType[][];
}

export interface Vector2D {
    x: number;
    y: number;
}

export enum CardinalDirection {
    north = "north",
    east = "east",
    south = "south",
    west = "west",
    northWest = "north west",
    northEast = "north east",
    southEast = "south east",
    southWest = "south west"
}

export enum Map2DCoordType {
    boundary = "0",
    traversable = "1",
    start = "2",
    end = "3"
}