import React from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string | null;
  hint?: string | null;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  hint,
  required,
  children,
}) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
      <label
        htmlFor={id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 700,
          color: 'var(--color-text-main)',
          fontSize: 'var(--font-size-base)',
        }}
      >
        <span>{label}</span>
        {required && (
          <span style={{ color: 'var(--color-danger)' }} aria-hidden="true">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="input-hint" style={{ margin: 0 }}>
          {hint}
        </p>
      )}

      {children}

      {error && (
        <p id={errorId} role="alert" className="input-error" style={{ margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
};
