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
  } while (index2 === index1); // Ensure the second index is different from the first

  const item2 = arr[index2];

  return [item1, item2];
}