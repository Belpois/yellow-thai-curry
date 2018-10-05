import { Vector2D, Map2D, CardinalDirection, Map2DCoordType, Dictionary } from "./model"
import raceTrack from "./track";

const CARDINAL_DIRECTION_OPPOSITE: Dictionary<CardinalDirection> = {
	[CardinalDirection.north]: CardinalDirection.south,
	[CardinalDirection.east]: CardinalDirection.west,
	[CardinalDirection.south]: CardinalDirection.north,
	[CardinalDirection.west]: CardinalDirection.west
};

const CARDINAL_DIRECTION_OPPOSITE_PAIRS: Dictionary<CardinalDirection[]> = {
	[CardinalDirection.north]: [CardinalDirection.east, CardinalDirection.west],
	[CardinalDirection.east]: [CardinalDirection.south, CardinalDirection.north],
	[CardinalDirection.south]: [CardinalDirection.west, CardinalDirection.east],
	[CardinalDirection.west]: [CardinalDirection.north, CardinalDirection.south]
}

function stepVector(direction: CardinalDirection, vector: Vector2D, step = 1): Vector2D {
	switch (direction) {
		case CardinalDirection.north:
			return {
				x: vector.x,
				y: vector.y - step
			}

		case CardinalDirection.east:
			return {
				x: vector.x + step,
				y: vector.y
			}

		case CardinalDirection.south:
			return {
				x: vector.x,
				y: vector.y + step
			}

		case CardinalDirection.west:
			return {
				x: vector.x - step,
				y: vector.y
			}

		case CardinalDirection.northWest:
			return {
				x: vector.x - step,
				y: vector.y - step
			}

		case CardinalDirection.northEast:
			return {
				x: vector.x + step,
				y: vector.y - step
			}

		case CardinalDirection.southEast:
			return {
				x: vector.x + step,
				y: vector.y + step
			}

		case CardinalDirection.southWest:
			return {
				x: vector.x - step,
				y: vector.y + step
			}
	}
}

function vector2DByIndex(index: number, map: Map2D): Vector2D {
	const y = Math.floor(index / map.stride);
	const x = (index % map.stride);
	return { x, y };
}

function indexByVector2D(vector: Vector2D, map: Map2D): number {
	return (vector.y * map.stride) + vector.x
}

function findVector2D(char: string, map: Map2D, skipVector?: Vector2D): Vector2D {
	let skipIndex = 0;
	if (skipVector) {
		skipIndex = indexByVector2D(skipVector, map) + 1;
	}

	const index = map.data.indexOf(char, skipIndex);
	return vector2DByIndex(index, map);
}

function getTypeByVector(vector: Vector2D, map: Map2D): Map2DCoordType {
	return map.arr[vector.y][vector.x];
}

function verifyVector2D(type: Map2DCoordType, vector: Vector2D, map: Map2D): boolean {
	const result = getTypeByVector(vector, map);
	return result === type;
}

interface PositionInfo {
	vector: Vector2D;
	forwardDirection: CardinalDirection,
	type: Map2DCoordType
}

function getForwardDirection(oppositeDirection: Map2DCoordType, vector: Vector2D, map: Map2D): PositionInfo | undefined {
	const north = verifyVector2D(oppositeDirection, stepVector(CardinalDirection.north, vector), map);
	if (north) {
		return {
			forwardDirection: CardinalDirection.south,
			vector: vector,
			type: getTypeByVector(vector, map)
		};
	}

	const east = verifyVector2D(oppositeDirection, stepVector(CardinalDirection.east, vector), map);
	if (east) {
		return {
			forwardDirection: CardinalDirection.west,
			vector: vector,
			type: getTypeByVector(vector, map)
		};
	}

	const south = verifyVector2D(oppositeDirection, stepVector(CardinalDirection.south, vector), map);
	if (south) {
		return {
			forwardDirection: CardinalDirection.north,
			vector: vector,
			type: getTypeByVector(vector, map)
		};
	}

	const west = verifyVector2D(oppositeDirection, stepVector(CardinalDirection.west, vector), map);
	if (west) {
		return {
			forwardDirection: CardinalDirection.east,
			vector: vector,
			type: getTypeByVector(vector, map)
		};
	}

	return undefined;
}

function searchLinear(type: Map2DCoordType, oppositeDirection: Map2DCoordType, forward: boolean, startVector: PositionInfo, map: Map2D): PositionInfo[] {
	const results = [];

	// search forward
	let counter = 0;
	while (true) {
		let steppedVector;

		if (startVector.forwardDirection === CardinalDirection.east || startVector.forwardDirection === CardinalDirection.west) {
			steppedVector = stepVector(forward ? CardinalDirection.south : CardinalDirection.north, startVector.vector, counter + 1);
		}
		else if (startVector.forwardDirection === CardinalDirection.north || startVector.forwardDirection === CardinalDirection.south) {
			steppedVector = stepVector(forward ? CardinalDirection.east : CardinalDirection.west, startVector.vector, counter + 1);
		}

		counter++;

		if (!steppedVector) {
			continue;
		}

		if (!verifyVector2D(type, steppedVector, map)) {
			break;
		}

		const forwardDirection = getForwardDirection(oppositeDirection, steppedVector, map);

		if (!forwardDirection) {
			continue;
		}

		results.push(forwardDirection);
	}

	return results;
}

function findStartLine(map: Map2D): PositionInfo[] | undefined {
	const startVector = getForwardDirection(Map2DCoordType.end, findVector2D(Map2DCoordType.start, map), map);

	if (!startVector) {
		return undefined;
	}

	return [
		startVector,
		...searchLinear(Map2DCoordType.start, Map2DCoordType.end, true, startVector, map),
		...searchLinear(Map2DCoordType.start, Map2DCoordType.end, false, startVector, map)
	]
}

function findFinnishLine(map: Map2D): PositionInfo[] | undefined {
	const startVector = getForwardDirection(Map2DCoordType.start, findVector2D(Map2DCoordType.end, map), map);

	if (!startVector) {
		return undefined;
	}

	return [
		startVector,
		...searchLinear(Map2DCoordType.end, Map2DCoordType.start, true, startVector, map),
		...searchLinear(Map2DCoordType.end, Map2DCoordType.start, false, startVector, map)
	]
}

interface RayTraceHit {
	path: PositionInfo[],
	hit: {
		vector: Vector2D,
		type: Map2DCoordType
	}
}

function rayTrace(traceType: Map2DCoordType, position: PositionInfo, map: Map2D): RayTraceHit {
	const path = [];
	let hit;

	// search forward
	let counter = 0;
	while (true) {
		let steppedVector = stepVector(position.forwardDirection, position.vector, counter + 1);
		counter++;

		if (!verifyVector2D(traceType, steppedVector, map)) {
			const hitType = getTypeByVector(steppedVector, map);
			hit = {
				vector: steppedVector,
				type: hitType
			}
			break;
		}

		path.push({
			forwardDirection: position.forwardDirection,
			vector: steppedVector,
			type: getTypeByVector(steppedVector, map)
		});
	}

	return {
		path,
		hit,
	};
}

function correctPosition(minPadding: number, positionInfo: PositionInfo, map: Map2D): PositionInfo {
	const verificationTable: Dictionary<CardinalDirection[]> = {
		[CardinalDirection.north]: [CardinalDirection.west, CardinalDirection.east],
		[CardinalDirection.east]: [CardinalDirection.north, CardinalDirection.south],
		[CardinalDirection.south]: [CardinalDirection.east, CardinalDirection.west],
		[CardinalDirection.west]: [CardinalDirection.south, CardinalDirection.north]
	};

	const verificationArray = verificationTable[positionInfo.forwardDirection];

	let correctedVector = { ...positionInfo.vector };
	for (const forwardDirection of verificationArray) {
		var rayTraceHit = rayTrace(Map2DCoordType.traversable, {
			forwardDirection,
			vector: positionInfo.vector,
			type: positionInfo.type
		}, map)

		if (rayTraceHit.path.length >= minPadding) {
			continue;
		}

		const correctionAmount = minPadding - rayTraceHit.path.length;
		const intermediateCorrectedVector = stepVector(CARDINAL_DIRECTION_OPPOSITE[forwardDirection], correctedVector, correctionAmount);
		const type = getTypeByVector(intermediateCorrectedVector, map);
		if (type !== Map2DCoordType.traversable) {
			continue;
		}

		correctedVector = intermediateCorrectedVector;
	}

	return {
		forwardDirection: positionInfo.forwardDirection,
		vector: correctedVector,
		type: getTypeByVector(correctedVector, map)
	}
}

function correctPath(minPadding: number, rayTraceHit: RayTraceHit, map: Map2D, trimEnd = true): PositionInfo[] {
	const results = [];
	for (const position of [...rayTraceHit.path].slice(0, rayTraceHit.path.length - (trimEnd ? minPadding : 0))) {
		const correctedPosition = correctPosition(minPadding, position, map);
		results.push(correctedPosition);
	}
	return results;
}


function takePath(position: PositionInfo, minPadding: number, map: Map2D, trimEnd = true): PositionInfo | undefined {
	const rayTraceHit = rayTrace(Map2DCoordType.traversable, position, map);

	if (!rayTraceHit.path.length) {
		return undefined;
	}

	const correctedResult = correctPath(minPadding, rayTraceHit, map, trimEnd);
	return correctedResult[correctedResult.length - 1];
}


function changeDirection(position: PositionInfo, minPadding: number, map: Map2D, directionChanges: CardinalDirection[]): PositionInfo {
	const allowedDirections = CARDINAL_DIRECTION_OPPOSITE_PAIRS[position.forwardDirection];

	for (const allowedDirection of allowedDirections) {
		const positionData = {
			forwardDirection: allowedDirection,
			vector: position.vector,
			type: position.type
		};
		const pathTaken = takePath(positionData, minPadding, map, false);

		if (!pathTaken) {
			continue;
		}

		if (pathTaken.type === Map2DCoordType.end) {
			return pathTaken;
		}

		console.log(">>> pathTaken2", directionChanges.length, pathTaken.type, pathTaken.vector, pathTaken.forwardDirection);

		return changeDirection(pathTaken, minPadding, map, [...directionChanges, pathTaken.forwardDirection]);
	}

	return position;
}

function traverse(minPadding: number, map: Map2D) {
	const startLineVectors = findStartLine(raceTrack);

	if (!startLineVectors) {
		throw new Error("Could not find a Start Line Vectors");
	}

	const traces = [];
	for (const startLineVector of startLineVectors) {
		const position = takePath(startLineVector, minPadding, map);
		traces.push(position);
	}

	const startPath = traces[5]!;
	console.log(">>> start", startPath.type, startPath.vector, startPath.forwardDirection);
	const result = changeDirection(startPath, minPadding, map, [startPath.forwardDirection]);
	console.log(">>> result", result.type, result.vector, result.forwardDirection);
}

function visualizeMap(vector: Vector2D, map: Map2D) {
	console.clear();

	for (var y = 0; y >= map.arr.length; y++) {
		const row = map.arr[y].join();
		if (y === vector.y) {
			const data = row.substr(0, vector.x) + "%" + row.substr(vector.x + 1);
			console.log(data);
			continue;
		}

		console.log(row);
	}
}

traverse(2, raceTrack);