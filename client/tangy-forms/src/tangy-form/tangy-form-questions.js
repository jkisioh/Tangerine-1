/* jshint esversion: 6 */

import {Element as PolymerElement} from '../../p3/node_modules/@polymer/polymer/polymer-element.js'
// import '../../node_modules/redux/dist/redux.js'
import {FORM_OPEN, formOpen, FORM_RESPONSE_COMPLETE, FOCUS_ON_ITEM, ITEM_OPEN, ITEM_CLOSE, ITEM_DISABLE, ITEM_ENABLE, ITEMS_INVALID, ITEM_CLOSE_STUCK, ITEM_NEXT,
  ITEM_BACK,ITEM_CLOSED,ITEM_DISABLED, ITEM_ENABLED, ITEM_VALID, INPUT_ADD, INPUT_VALUE_CHANGE, INPUT_DISABLE, INPUT_ENABLE,
  INPUT_INVALID, INPUT_VALID, INPUT_HIDE, INPUT_SHOW, NAVIGATE_TO_NEXT_ITEM, NAVIGATE_TO_PREVIOUS_ITEM, TANGY_TIMED_MODE_CHANGE,
  TANGY_TIMED_TIME_SPENT, TANGY_TIMED_LAST_ATTEMPTED, TANGY_TIMED_INCREMENT} from './tangy-form-actions.js'

    /**
     * `tangy-form-questions`
     * An element used to encapsulate form elements for multipage forms with a response in PouchDB.
     *
     * @customElement
     * @polymer
     * @demo demo/index.html
     */

export class TangyFormQuestions extends PolymerElement {

      static get template () {
        return `
      <style>
        :host {
          width: 100%;
          display: block;
          margin: 0px;
          padding: 0px;
        }
        #previousItemButton {
          position: fixed;
          bottom: 73px;
          right: 7px;
        }
        #nextItemButton {
          position: fixed;
          bottom: 10px;
          right: 7px;
        }
        #markCompleteFab, #lockedFab {
          position: fixed;
          top: 137px;
          right: 7px;
        }
        :host(:not([linear-mode])) #nextItemButton,
        :host(:not([linear-mode])) #previousItemButton
         {
          display: none;
        }
        :host([hide-complete-button]) #markCompleteFab {
          display: none !important;
        }
        #progress {
          position: fixed;
          bottom: 0px;
        }
        paper-progress {
          width: 100%;
        }
      </style>
      <slot></slot>
      <div id="nav">
        <paper-fab id="markCompleteFab" on-click="markComplete" icon="icons:check"></paper-fab>
        <paper-fab id="lockedFab" icon="icons:lock" disabled></paper-fab>
        <paper-fab id="previousItemButton" on-click="focusOnPreviousItem" icon="hardware:keyboard-arrow-up"></paper-fab>
        <paper-fab id="nextItemButton" on-click="focusOnNextItem" icon="hardware:keyboard-arrow-down"></paper-fab>
      </div>
      <paper-progress id="progress" value="0" secondary-progress="0"></paper-progress>
        `
      }

      static get is() { return 'tangy-form-questions'; }

      static get properties() {
        return {
          // Pass in code to be eval'd on any form input change.
          onChange: {
            type: String,
            value: '',
            reflectToAttribute: true
          },
          // Set liniar-mode to turn on navigation and turn off item action buttons.
          linearMode: {
            type: Boolean,
            value: false,
            reflectToAttribute: true
          },
          // Hide closed items to focus user on current item.
          hideClosedItems: {
            type: Boolean,
            value: false,
            reflectToAttribute: true
          },
          hideCompleteButton: {
            type: Boolean,
            value: false,
            reflectToAttribute: true
          }

        }
      }

      connectedCallback() {
        super.connectedCallback()
        // Set up the store.
        this.store = window.tangyFormStore

        // Move to reducer.
        this.querySelectorAll('tangy-form-item').forEach((item) => {
          if (this.linearMode) item.noButtons = true
        })
        // Register tangy redux hook.
        window.tangyReduxHook_INPUT_VALUE_CHANGE = (store) => {
          let state = store.getState()
          let inputs = {}
          state.inputs.forEach(input => inputs[input.name] = input)
          let items = {}
          state.items.forEach(item => items[item.name] = item)
          let getValue = this.getValue.bind(this)
          // Eval on-change on tangy-form.
          eval(this.onChange)
          // Eval on-change on forms.
          let forms = [].slice.call(this.querySelectorAll('form[on-change]'))
          forms.forEach((form) => {
            if (form.hasAttribute('on-change')) eval(form.getAttribute('on-change'))
          })
        }

        // Subscribe to the store to reflect changes.
        this.unsubscribe = this.store.subscribe(this.throttledReflect.bind(this))
 
        // Notify store is open and send up the items if it does not have them.
        if (this.response.items.length === 0) {
          this.response.items = ([].slice.call(this.querySelectorAll('tangy-form-item'))).map((element) => element.getProps())
        }

        // Listen for tangy inputs dispatching INPUT_VALUE_CHANGE.
        this.addEventListener('INPUT_VALUE_CHANGE', (event) => {
          this.store.dispatch({
            type: INPUT_VALUE_CHANGE,  
            inputName: event.detail.inputName, 
            inputValue: event.detail.inputValue, 
            inputInvalid: event.detail.inputInvalid,
            inputIncomplete: event.detail.inputIncomplete
          })
        })

        formOpen(this.response)
        // Flag for first render.
        this.hasNotYetFocused = true

      }

      disconnectedCallback() {
        this.unsubscribe()
      }

      // Prevent parallel reflects, leads to race conditions.
      throttledReflect(iAmQueued = false) {
        // If there is an reflect already queued, we can quit. 
        if (this.reflectQueued && !iAmQueued) return
        if (this.reflectRunning) {
          this.reflectQueued = true
          setTimeout(() => this.throttledReflect(true), 200)
        } else {
          this.reflectRunning = true
          this.reflect()
          this.reflectRunning = false
          if (iAmQueued) this.reflectQueued = false
        }
      }

      // Apply state in the store to the DOM.
      reflect() {

        let state = this.store.getState()
        // Set initial this.previousState
        if (!this.previousState) this.previousState = state

        // Set state in tangy-form-item elements.
        let items = [].slice.call(this.querySelectorAll('tangy-form-item'))
        items.forEach((item) => {
          let index = state.items.findIndex((itemState) => item.id == itemState.id) 
          if (index !== -1) item.setProps(state.items[index])
        })
        
        // Set state in input elements.
        let inputs = [].slice.call(this.querySelectorAll('[name]'))
        inputs.forEach((input) => {
          let index = state.inputs.findIndex((inputState) => inputState.name == input.name) 
          if (index !== -1) input.setProps(state.inputs[index])
        })

        // Set progress state.
        this.$.progress.setAttribute('value', state.progress)

        // Find item to scroll to.
        if (state.focusIndex !== this.previousState.focusIndex || (this.linearMode && this.hasNotYetFocused)) {
          this.hasNotYetFocused = false
          setTimeout(() => {
            if (items[state.focusIndex]) items[state.focusIndex].scrollIntoView({behavior: 'smooth', block: 'start'})
          }, 200)
        }

        // Disable navigation buttons depending on wether there is a next or previous place to focus to.
        this.$.nextItemButton.disabled = (state.nextFocusIndex === -1 ||
                                          (state.items[state.focusIndex] && state.items[state.focusIndex].incomplete)
                                          ) ? true : false
        // Allow navigating back even if incomplete.
        this.$.previousItemButton.disabled = (state.previousFocusIndex === -1) ? true : false
        if (state.complete === true) {
          this.$.markCompleteFab.style.display =  'none'
          this.$.lockedFab.style.display =  'block'
        } else {
          this.$.markCompleteFab.style.display =  'block'
          this.$.lockedFab.style.display =  'none'
        }
        // Dispatch ALL_ITEMS_CLOSED if all items are now closed.
        let previouslyClosedItemCount = (this.previousState.items.filter(item => !item.open)).length
        let currentlyClosedItemCount = (state.items.filter(item => !item.open)).length
        if (previouslyClosedItemCount !== currentlyClosedItemCount && currentlyClosedItemCount === state.items.length) {
          this.dispatchEvent(new CustomEvent('ALL_ITEMS_CLOSED'))
        }

        // Stash as previous state.
        this.previousState = Object.assign({}, state)
      }

      focusOnPreviousItem(event) {
        this.$.previousItemButton.setAttribute('disabled', true)
        this.$.nextItemButton.setAttribute('disabled', true)
        let state = this.store.getState()
        let item = state.items.find(item => item.open)
        this.store.dispatch({ type: ITEM_BACK, itemId: item.id })
      }

      focusOnNextItem(event) {
        this.$.previousItemButton.setAttribute('disabled', true)
        this.$.nextItemButton.setAttribute('disabled', true)
        let state = this.store.getState()
        let item = state.items.find(item => item.open)
        this.store.dispatch({ type: ITEM_NEXT, itemId: item.id })
      }

      markComplete() {
        this.store.dispatch({type: "FORM_RESPONSE_COMPLETE"})
      }

      getValue(name) {
        let state = this.store.getState()
        let input = state.inputs.find((input) => input.name == name)
        if (input) return input.value
      }

    }

    
    window.customElements.define(TangyFormQuestions.is, TangyFormQuestions);
