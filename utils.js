// Helper function to compare two objects
function objectsEqual(obj1, obj2) {
  // Check if both are null or undefined
  if (obj1 === obj2) {
    return true;
  }

  // Check if both are objects
  if (
    typeof obj1 !== "object" ||
    typeof obj2 !== "object" ||
    obj1 === null ||
    obj2 === null
  ) {
    return false;
  }

  // Get the keys of both objects
  let keys1 = Object.keys(obj1);
  let keys2 = Object.keys(obj2);

  // Check if they have the same number of keys
  if (keys1.length !== keys2.length) {
    return false;
  }

  // Check if values of all keys are the same
  for (let key of keys1) {
    if (!objectsEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

function arraysEqual(arr1, arr2) {
  // Check if arrays are of the same length
  if (arr1.length !== arr2.length) {
    return false;
  }

  // Check each pair of objects
  for (let i = 0; i < arr1.length; i++) {
    if (!objectsEqual(arr1[i], arr2[i])) {
      return false;
    }
  }

  return true;
}

// export the functions

module.exports = {
  objectsEqual,
  arraysEqual,
};
