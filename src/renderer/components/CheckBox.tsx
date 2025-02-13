import { Omit } from '@shared/interfaces';
import * as React from 'react';
import { useCallback } from 'react';
import {FancyAnimation} from '@renderer/components/FancyAnimation';

/** Props for an input element. */
type InputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export type CheckBoxProps = Omit<InputProps, 'type'> & {
  /** Called when the checkbox becomes checked or unchecked. This is called right after "onChange". */
  onToggle?: (isChecked: boolean) => void;
};

/** Basic checkbox element. Wrapper around the <input> element. */
export function CheckBox(props: CheckBoxProps) {
  const { onToggle, onChange, ...rest } = props;
  // Hooks
  const onChangeCallback = useCallback(() => {
    if (onToggle) { onToggle(!props.checked); }
  }, [props.checked, onToggle, onChange]);
  // Render
  return (
    <div
      className={(props.checked ? 'checkbox--checked' : 'checkbox--unchecked') + ' checkbox ' + rest.className}
      onClick={onChangeCallback}>
      <FancyAnimation
        fancyRender={() => (
          <div className={(props.checked ? 'slider slider--animated slider-checked' : 'slider slider--animated')}/>
        )}
        normalRender={() => (
          <div className={(props.checked ? 'slider slider-checked' : 'slider')}/>
        )}/>
    </div>
  );
}
