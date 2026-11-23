/**
 * Time and Appointment Slot Utilities
 * Ensures that past time slots on current date cannot be booked or displayed.
 */

export const isSlotPast = (slotStr: string, dateStr?: string): boolean => {
  if (!slotStr) return false;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  if (dateStr && dateStr < today) return true;
  if (dateStr && dateStr > today) return false;

  // Same day comparison: check if slot's start time is in the past
  let slotHours = 0;
  let slotMinutes = 0;
  const trimmed = slotStr.trim();

  if (trimmed.toUpperCase().includes('AM') || trimmed.toUpperCase().includes('PM')) {
    const isPM = trimmed.toUpperCase().includes('PM');
    const isAM = trimmed.toUpperCase().includes('AM');
    const cleanTime = trimmed.replace(/AM|PM/gi, '').trim();
    const parts = cleanTime.split(':').map((p) => parseInt(p, 10) || 0);
    slotHours = parts[0];
    slotMinutes = parts[1] || 0;
    if (isPM && slotHours < 12) slotHours += 12;
    if (isAM && slotHours === 12) slotHours = 0;
  } else {
    const parts = trimmed.split(':').map((p) => parseInt(p, 10) || 0);
    slotHours = parts[0];
    slotMinutes = parts[1] || 0;
  }

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  if (slotHours < currentHours) return true;
  if (slotHours === currentHours && slotMinutes <= currentMinutes) return true;
  return false;
};
