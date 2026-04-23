import * as React from "react"

export function NativeSelect({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="border rounded-md px-3 py-2 w-full bg-white"
    >
      {children}
    </select>
  )
}

export function NativeSelectOption({
  children,
  ...props
}: React.OptionHTMLAttributes<HTMLOptionElement>) {
  return <option {...props}>{children}</option>
}