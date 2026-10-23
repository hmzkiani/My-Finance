const REQUIRED_FIELDS = ['name', 'email', 'subject', 'message'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(form) {
  const errors = {};
  for (const field of REQUIRED_FIELDS) {
    if (!String(form[field] || '').trim()) errors[field] = 'This field is required.';
  }
  const email = String(form.email || '').trim();
  if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  return errors;
}
