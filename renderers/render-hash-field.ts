var hashFieldEl = document.getElementById('hash-field') as HTMLInputElement;

export function renderHashField(params) {
  if (hashFieldEl) {
    hashFieldEl.value = JSON.stringify(params, null, 2);
  }
}

export function getHashFieldObject() {
  // Value will contain the edited value. textContent has the original value.
  return JSON.parse(hashFieldEl?.value || '');
}
