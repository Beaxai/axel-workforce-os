const fileMap = new Map<string, File>();

export function storeFile(id: string, file: File) {
  fileMap.set(id, file);
}

export function getFile(id: string): File | undefined {
  return fileMap.get(id);
}

export function removeFile(id: string) {
  fileMap.delete(id);
}

export function getAllFiles(): Map<string, File> {
  return fileMap;
}

export function clearFiles() {
  fileMap.clear();
}
