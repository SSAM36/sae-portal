const STORAGE_KEY = 'sae_local_roster';

const readStorage = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeStorage = (applicants) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applicants));
  window.dispatchEvent(new Event('sae-roster-updated'));
};

export const getLocalApplicants = () => readStorage();

export const saveLocalApplicants = (applicants) => {
  writeStorage(Array.isArray(applicants) ? applicants : []);
};

export const upsertLocalApplicant = (applicant) => {
  const applicants = readStorage();
  const index = applicants.findIndex((item) => item.id === applicant.id);

  if (index >= 0) {
    applicants[index] = applicant;
  } else {
    applicants.push(applicant);
  }

  writeStorage(applicants);
  return applicants;
};

export const generateLocalApplicantId = () =>
  `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;