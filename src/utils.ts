// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IAnyObject = Record<string, any>;

export const deepAssign = <T extends IAnyObject, U extends IAnyObject = T>(
  originObject: T,
  ...assignObjects: U[]
): T & U => {
  if (assignObjects.length === 0) return originObject as T & U;

  const assignObject = assignObjects.shift() as IAnyObject;

  Object.keys(assignObject).forEach((property) => {
    if (
      typeof originObject[property] === "object" &&
      !Array.isArray(originObject[property]) &&
      typeof assignObject[property] === "object" &&
      !Array.isArray(assignObject[property])
    )
      deepAssign(originObject[property], assignObject[property]);
    else if (typeof assignObject[property] === "object")
      if (Array.isArray(assignObject[property]))
        (originObject as IAnyObject)[property] = [
          ...(assignObject[property] as unknown[]),
        ];
      else
        (originObject as IAnyObject)[property] = {
          ...(assignObject[property] as Record<string, unknown>),
        };
    else
      (originObject as IAnyObject)[property] = assignObject[
        property
      ] as unknown;
  });

  return deepAssign(originObject, ...assignObjects);
};
