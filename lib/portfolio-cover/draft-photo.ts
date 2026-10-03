let pendingPortfolioCoverPhoto: File | null = null

export function setPendingPortfolioCoverPhoto(file: File) {
  pendingPortfolioCoverPhoto = file
}

export function peekPendingPortfolioCoverPhoto() {
  return pendingPortfolioCoverPhoto
}

export function takePendingPortfolioCoverPhoto() {
  const file = pendingPortfolioCoverPhoto
  pendingPortfolioCoverPhoto = null
  return file
}
