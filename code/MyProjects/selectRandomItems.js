export async function selectRandomItems(originalArray, count) {
  if (count > originalArray.length) {
    console.warn("Count requested is greater than array length. Returning all items.");
    return [...originalArray]; // Return a copy of the original array
  }

  const shuffledArray = [...originalArray]; // Create a shallow copy
  const selectedItems = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * shuffledArray.length);
    selectedItems.push(shuffledArray[randomIndex]);
    shuffledArray.splice(randomIndex, 1); // Remove the selected item to avoid duplicates
  }

  return selectedItems;
}