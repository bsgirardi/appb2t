"use client";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { CatalogContact } from "@/domain/catalog-requests/types";
export function RequestContactForm({
  contact,
  onChange,
  errors,
}: {
  contact: CatalogContact;
  onChange: (next: CatalogContact) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="store-request-fields">
      <Field
        id="request-name"
        label="Seu nome"
        autoComplete="name"
        value={contact.name}
        maxLength={120}
        onChange={(e) => onChange({ ...contact, name: e.target.value })}
        aria-invalid={!!errors.name}
        aria-describedby={errors.name ? "request-name-error" : undefined}
      />
      {errors.name && (
        <p id="request-name-error" role="alert">
          {errors.name}
        </p>
      )}
      <Label htmlFor="request-channel">Como prefere ser atendido?</Label>
      <NativeSelect
        id="request-channel"
        value={contact.preferredChannel}
        onChange={(e) =>
          onChange({
            ...contact,
            preferredChannel: e.target
              .value as CatalogContact["preferredChannel"],
          })
        }
      >
        <option value="whatsapp">WhatsApp</option>
        <option value="email">E-mail</option>
      </NativeSelect>
      <Field
        id="request-phone"
        label="Seu WhatsApp"
        type="tel"
        autoComplete="tel"
        value={contact.phone}
        maxLength={40}
        onChange={(e) => onChange({ ...contact, phone: e.target.value })}
        aria-invalid={!!errors.phone}
        aria-describedby={errors.phone ? "request-phone-error" : undefined}
      />
      {errors.phone && (
        <p id="request-phone-error" role="alert">
          {errors.phone}
        </p>
      )}
      <Field
        id="request-email"
        label="Seu e-mail"
        type="email"
        autoComplete="email"
        value={contact.email}
        maxLength={254}
        onChange={(e) => onChange({ ...contact, email: e.target.value })}
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? "request-email-error" : undefined}
      />
      {errors.email && (
        <p id="request-email-error" role="alert">
          {errors.email}
        </p>
      )}
      <small>Informe o contato do canal escolhido. O outro é opcional.</small>
    </div>
  );
}
