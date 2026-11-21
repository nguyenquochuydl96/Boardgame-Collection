let applyingRemote = false;

export function setSyncApplyingRemote(val: boolean): void {
  applyingRemote = val;
}

export function isSyncApplyingRemote(): boolean {
  return applyingRemote;
}
