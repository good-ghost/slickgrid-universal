import { Constants } from '../constants';
import { KeyCode } from '../enums/index';
import { Column, ColumnEditor, Editor, EditorArguments, EditorValidator, EditorValidatorOutput } from '../interfaces/index';
import { setDeepValue, getDescendantProperty } from '../services/utilities';

const defaultDecimalPlaces = 0;

/*
 * An example of a 'detached' editor.
 * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
 */
export class FloatEditor implements Editor {
  private _input: HTMLInputElement;
  private _lastInputEvent: KeyboardEvent;
  originalValue: number | string;

  /** SlickGrid Grid object */
  grid: any;

  constructor(private args: EditorArguments) {
    if (!args) {
      throw new Error('[Slickgrid-Universal] Something is wrong with this grid, an Editor must always have valid arguments.');
    }
    this.grid = args.grid;
    this.init();
  }

  /** Get Column Definition object */
  get columnDef(): Column | undefined {
    return this.args && this.args.column;
  }

  /** Get Column Editor object */
  get columnEditor(): ColumnEditor {
    return this.columnDef && this.columnDef.internalColumnEditor || {};
  }

  /** Get the Editor DOM Element */
  get editorDomElement(): any {
    return this._input;
  }

  get hasAutoCommitEdit() {
    return this.grid && this.grid.getOptions && this.grid.getOptions().autoCommitEdit;
  }

  /** Get the Validator function, can be passed in Editor property or Column Definition */
  get validator(): EditorValidator | undefined {
    return (this.columnEditor && this.columnEditor.validator) || (this.columnDef && this.columnDef.validator);
  }

  init() {
    const columnId = this.columnDef && this.columnDef.id;
    const placeholder = this.columnEditor && this.columnEditor.placeholder || '';
    const title = this.columnEditor && this.columnEditor.title || '';

    this._input = document.createElement('input') as HTMLInputElement;
    this._input.className = `editor-text editor-${columnId}`;
    this._input.title = title;
    this._input.type = 'number';
    this._input.setAttribute('role', 'presentation');
    this._input.autocomplete = 'off';
    this._input.placeholder = placeholder;
    this._input.title = title;
    this._input.step = this.getInputDecimalSteps();
    const cellContainer = this.args?.container;
    if (cellContainer && typeof cellContainer.appendChild === 'function') {
      cellContainer.appendChild(this._input);
    }

    this._input.onkeydown = ((event: KeyboardEvent) => {
      this._lastInputEvent = event;
      if (event.keyCode === KeyCode.LEFT || event.keyCode === KeyCode.RIGHT) {
        event.stopImmediatePropagation();
      }
    });

    // the lib does not get the focus out event for some reason
    // so register it here
    if (this.hasAutoCommitEdit) {
      this._input.addEventListener('focusout', () => this.save());
    }

    setTimeout(() => this.focus(), 50);
  }

  destroy() {
    if (this._input) {
      this._input.remove();
    }
  }

  focus(): void {
    this._input.focus();
  }

  getDecimalPlaces(): number {
    // returns the number of fixed decimal places or null
    let rtn = (this.columnEditor.params && this.columnEditor.params.hasOwnProperty('decimalPlaces')) ? this.columnEditor.params.decimalPlaces : undefined;

    if (rtn === undefined) {
      rtn = defaultDecimalPlaces;
    }
    return (!rtn && rtn !== 0 ? null : rtn);
  }

  getInputDecimalSteps(): string {
    const decimals = this.getDecimalPlaces();
    let zeroString = '';
    for (let i = 1; i < decimals; i++) {
      zeroString += '0';
    }

    if (decimals > 0) {
      return `0.${zeroString}1`;
    }
    return '1';
  }

  getValue(): string {
    return this._input.value || '';
  }

  setValue(value: number | string) {
    this._input.value = `${value}`;
  }

  applyValue(item: any, state: any) {
    const fieldName = this.columnDef && this.columnDef.field;
    if (fieldName !== undefined) {
      const isComplexObject = fieldName.indexOf('.') > 0; // is the field a complex object, "address.streetNumber"

      const validation = this.validate(state);
      const newValue = (validation && validation.valid) ? state : '';

      // set the new value to the item datacontext
      if (isComplexObject) {
        setDeepValue(item, fieldName, newValue);
      } else {
        item[fieldName] = newValue;
      }
    }
  }

  isValueChanged(): boolean {
    const elmValue = this._input.value;
    const lastEvent = this._lastInputEvent && this._lastInputEvent.keyCode;
    if (this.columnEditor && this.columnEditor.alwaysSaveOnEnterKey && lastEvent === KeyCode.ENTER) {
      return true;
    }
    return (!(elmValue === '' && this.originalValue === null)) && (elmValue !== this.originalValue);
  }

  loadValue(item: any) {
    const fieldName = this.columnDef && this.columnDef.field;

    if (fieldName !== undefined) {
      // is the field a complex object, "address.streetNumber"
      const isComplexObject = fieldName.indexOf('.') > 0;

      if (item && this.columnDef && (item.hasOwnProperty(fieldName) || isComplexObject)) {
        const value = (isComplexObject) ? getDescendantProperty(item, fieldName) : item[fieldName];
        this.originalValue = value;
        const decPlaces = this.getDecimalPlaces();
        if (decPlaces !== null && (this.originalValue || this.originalValue === 0) && (+this.originalValue).toFixed) {
          this.originalValue = (+this.originalValue).toFixed(decPlaces);
        }
        this._input.value = `${this.originalValue}`;
        this._input.select();
      }
    }
  }

  save() {
    const validation = this.validate();
    if (validation && validation.valid && this.isValueChanged()) {
      if (this.hasAutoCommitEdit) {
        this.grid.getEditorLock().commitCurrentEdit();
      } else {
        this.args.commitChanges();
      }
    }
  }

  serializeValue() {
    const elmValue = this._input.value;
    if (elmValue === '' || isNaN(+elmValue)) {
      return elmValue;
    }

    let rtn = parseFloat(elmValue);
    const decPlaces = this.getDecimalPlaces();
    if (decPlaces !== null && (rtn || rtn === 0) && rtn.toFixed) {
      rtn = parseFloat(rtn.toFixed(decPlaces));
    }

    return rtn;
  }

  validate(inputValue?: any): EditorValidatorOutput {
    const elmValue = (inputValue !== undefined) ? inputValue : this._input && this._input.value;
    const floatNumber = !isNaN(elmValue as number) ? parseFloat(elmValue) : null;
    const decPlaces = this.getDecimalPlaces();
    const isRequired = this.columnEditor.required;
    const minValue = this.columnEditor.minValue;
    const maxValue = this.columnEditor.maxValue;
    const errorMsg = this.columnEditor.errorMessage;
    const mapValidation = {
      '{{minValue}}': minValue,
      '{{maxValue}}': maxValue,
      '{{minDecimal}}': 0,
      '{{maxDecimal}}': decPlaces
    };
    let isValid = true;
    let outputMsg = '';

    if (this.validator) {
      return this.validator(elmValue, this.args);
    } else if (isRequired && elmValue === '') {
      isValid = false;
      outputMsg = errorMsg || Constants.VALIDATION_REQUIRED_FIELD;
    } else if (isNaN(elmValue as number) || (decPlaces === 0 && !/^[-+]?(\d+(\.)?(\d)*)$/.test(elmValue))) {
      // when decimal value is 0 (which is the default), we accept 0 or more decimal values
      isValid = false;
      outputMsg = errorMsg || Constants.VALIDATION_EDITOR_VALID_NUMBER;
    } else if (minValue !== undefined && maxValue !== undefined && floatNumber !== null && (floatNumber < minValue || floatNumber > maxValue)) {
      // MIN & MAX Values provided
      // when decimal value is bigger than 0, we only accept the decimal values as that value set
      // for example if we set decimalPlaces to 2, we will only accept numbers between 0 and 2 decimals
      isValid = false;
      outputMsg = errorMsg || Constants.VALIDATION_EDITOR_NUMBER_BETWEEN.replace(/{{minValue}}|{{maxValue}}/gi, (matched) => mapValidation[matched]);
    } else if (minValue !== undefined && floatNumber !== null && floatNumber <= minValue) {
      // MIN VALUE ONLY
      // when decimal value is bigger than 0, we only accept the decimal values as that value set
      // for example if we set decimalPlaces to 2, we will only accept numbers between 0 and 2 decimals
      isValid = false;
      outputMsg = errorMsg || Constants.VALIDATION_EDITOR_NUMBER_MIN.replace(/{{minValue}}/gi, (matched) => mapValidation[matched]);
    } else if (maxValue !== undefined && floatNumber !== null && floatNumber >= maxValue) {
      // MAX VALUE ONLY
      // when decimal value is bigger than 0, we only accept the decimal values as that value set
      // for example if we set decimalPlaces to 2, we will only accept numbers between 0 and 2 decimals
      isValid = false;
      outputMsg = errorMsg || Constants.VALIDATION_EDITOR_NUMBER_MAX.replace(/{{maxValue}}/gi, (matched) => mapValidation[matched]);
    } else if ((decPlaces > 0 && !new RegExp(`^[-+]?(\\d*(\\.)?(\\d){0,${decPlaces}})$`).test(elmValue))) {
      // when decimal value is bigger than 0, we only accept the decimal values as that value set
      // for example if we set decimalPlaces to 2, we will only accept numbers between 0 and 2 decimals
      isValid = false;
      outputMsg = errorMsg || Constants.VALIDATION_EDITOR_DECIMAL_BETWEEN.replace(/{{minDecimal}}|{{maxDecimal}}/gi, (matched) => mapValidation[matched]);
    }

    return {
      valid: isValid,
      msg: outputMsg
    };
  }
}
