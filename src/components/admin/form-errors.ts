export function revealAndFocusInvalid(form: HTMLFormElement): void {
  const invalid = Array.from(
    form.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement
    >("input, select, textarea, button"),
  ).filter((control) =>
    control.getAttribute("aria-invalid") === "true" ||
    (control.willValidate && !control.validity.valid),
  );
  for (const control of invalid) {
    let parent = control.parentElement;
    while (parent && parent !== form) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
  }
  invalid[0]?.focus();
}
