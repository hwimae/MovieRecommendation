import { Input, Radio, RadioGroup, Select, SelectItem, Textarea } from "@heroui/react";
import React, { type ComponentProps, type ReactNode } from "react";

export type FormFieldOption = {
  value: string;
  label: string;
};

type SharedProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
};

type HeroInputProps = ComponentProps<typeof Input>;
type HeroTextareaProps = ComponentProps<typeof Textarea>;

type InputFieldProps = SharedProps &
  Omit<HeroInputProps, "id" | "label" | "description" | "errorMessage" | "isInvalid"> & {
    kind?: "input";
  };

type TextareaFieldProps = SharedProps &
  Omit<HeroTextareaProps, "id" | "label" | "description" | "errorMessage" | "isInvalid"> & {
    kind: "textarea";
  };

type SelectFieldProps = SharedProps & {
  kind: "select";
  value: string;
  onValueChange: (value: string) => void;
  options: FormFieldOption[];
  placeholder?: string;
};

type RadioFieldProps = SharedProps & {
  kind: "radio";
  value: string;
  onValueChange: (value: string) => void;
  options: FormFieldOption[];
  orientation?: "horizontal" | "vertical";
};

export type FormFieldProps =
  | InputFieldProps
  | TextareaFieldProps
  | SelectFieldProps
  | RadioFieldProps;

/** Vùng chú thích dưới control: ưu tiên error, không có error thì hiện hint. */
function FieldFooter({ id, hint, error }: { id: string; hint?: string; error?: string }): ReactNode {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-onDangerSoft">
        {error}
      </p>
    );
  }
  if (hint) {
    return <p className="mt-1.5 text-sm text-textMuted">{hint}</p>;
  }
  return null;
}

export function FormField(props: FormFieldProps) {
  const { id, label, hint, error, required } = props;
  const describedBy = error ? `${id}-error` : undefined;

  const wrapperProps = {
    "data-testid": "form-field",
    "data-kind": props.kind ?? "input",
    className: "flex flex-col",
  } as const;

  // GIỚI HẠN đã biết: HeroUI Select đặt aria-invalid lên <select> ẩn,
  // không lên nút trigger nhìn thấy — chưa màn nào truyền error vào select.
  // Nếu cần validated select: chuyển ruột nhánh này sang <select> native.
  if (props.kind === "select") {
    const { value, onValueChange, options, placeholder } = props;

    return (
      <div {...wrapperProps}>
        <Select
          id={id}
          label={label}
          variant="bordered"
          radius="md"
          placeholder={placeholder}
          isRequired={required}
          isInvalid={Boolean(error)}
          aria-describedby={describedBy}
          selectedKeys={value ? [value] : []}
          onSelectionChange={(keys) => {
            const [first] = Array.from(keys as Set<string>);
            onValueChange(first ?? "");
          }}
        >
          {options.map((option) => (
            <SelectItem key={option.value}>{option.label}</SelectItem>
          ))}
        </Select>
        <FieldFooter id={id} hint={hint} error={error} />
      </div>
    );
  }

  if (props.kind === "radio") {
    const { value, onValueChange, options, orientation = "horizontal" } = props;

    return (
      <div {...wrapperProps}>
        <RadioGroup
          label={label}
          orientation={orientation}
          isRequired={required}
          isInvalid={Boolean(error)}
          aria-describedby={describedBy}
          value={value}
          onValueChange={onValueChange}
        >
          {options.map((option) => (
            <Radio key={option.value} value={option.value}>
              {option.label}
            </Radio>
          ))}
        </RadioGroup>
        <FieldFooter id={id} hint={hint} error={error} />
      </div>
    );
  }

  if (props.kind === "textarea") {
    const { kind: _kind, id: _id, label: _label, hint: _hint, error: _error, required: _required, ...fieldProps } = props;

    return (
      <div {...wrapperProps}>
        <Textarea
          {...fieldProps}
          id={id}
          label={label}
          variant="bordered"
          isRequired={required}
          isInvalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        <FieldFooter id={id} hint={hint} error={error} />
      </div>
    );
  }

  const { kind: _kind, id: _id, label: _label, hint: _hint, error: _error, required: _required, ...fieldProps } = props;

  return (
    <div {...wrapperProps}>
      <Input
        {...fieldProps}
        id={id}
        label={label}
        variant="bordered"
        isRequired={required}
        isInvalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      <FieldFooter id={id} hint={hint} error={error} />
    </div>
  );
}
