export function revealAndFocusInvalid(form: HTMLFormElement): void {
  const invalid = Array.from(
    form.querySelectorAll<HTMLElement>('[aria-invalid="true"], :invalid'),
  ).filter((element) => element.matches("input, select, textarea, button"));
  for (const control of invalid) {
    let parent = control.parentElement;
    while (parent && parent !== form) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
  }
  invalid[0]?.focus();
}
