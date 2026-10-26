export async function ShuffleMyArray(MNumbers) {
  try {
    return await MNumbers.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.log(error);
  }
}

export async function selectRandomItems(originalArray, count) {
  if (count > originalArray.length) {
    console.warn("Count requested is greater than array length. Returning all items.");
    return [...originalArray];
  }

  const shuffledArray = [...originalArray];
  const selectedItems = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * shuffledArray.length);
    selectedItems.push(shuffledArray[randomIndex]);
    shuffledArray.splice(randomIndex, 1);
  }

  return selectedItems;
}

export async function pickTwoRandomItems(arr) {
  if (arr.length < 2) {
    console.warn("Array must contain at least two items to pick two distinct random items.");
    return [];
  }

  const index1 = Math.floor(Math.random() * arr.length);
  const item1 = arr[index1];

  let index2;
  do {
    index2 = Math.floor(Math.random() * arr.length);
  } while (index2 === index1);

  const item2 = arr[index2];

  return [item1, item2];
}

export default { ShuffleMyArray, selectRandomItems, pickTwoRandomItems };
