/*global document, CONFIG, window, json, alert, location */

import {IframeNode} from '../utils/iframe'
import EditorUtils from './EditorUtils'
import Json from '../modules/EditorJson'
import on from 'on'

export default class EditorSave {
  constructor() {
    this._json = Json.instance
    this._saveType = 'draft'

    this.onFileSaved = on(this)

    this._abeForm = document.querySelector('#abeForm')
    this._abeDisplayStatus = document.querySelector('[data-display-status]')
    this._abeFormSubmit = document.querySelector('#abeForm button[type=submit]')

    this._handleSubmitClick = this._submitClick.bind(this)

    this._btnSaves = document.querySelectorAll('.btn-save')
    Array.prototype.forEach.call(this._btnSaves, (btnSave) => {
      btnSave.addEventListener('click', this._handleSubmitClick)
    })

    var pageTpl = document.querySelector('#page-template')
    if(typeof pageTpl !== 'undefined' && pageTpl !== null) {
      document.querySelector('#page-template').addEventListener('load', () => {
        EditorUtils.checkAttribute()
      })
    }

    if(typeof this._abeForm !== 'undefined' && this._abeForm !== null) {
      this._formSubmit()
    }
  }

  /**
   * return abe form to json
   * @return {Object} json
   */
  serializeForm() {
    var inputs = [].slice.call(document.getElementById('abeForm').querySelectorAll('input'))
    var selects = [].slice.call(document.getElementById('abeForm').querySelectorAll('select'))
    inputs = inputs.concat(selects)
    var textareas = [].slice.call(document.getElementById('abeForm').querySelectorAll('textarea'))
    inputs = inputs.concat(textareas)

    this._json.data = json

    Array.prototype.forEach.call(inputs, (input) => {
      var dataId = input.getAttribute('data-id')
      if(input.type === 'file') return
      if(typeof dataId !== 'undefined' && dataId !== null) {
        if(dataId.indexOf('[') > -1){
          var obj = dataId.split('[')[0]
          var index = dataId.match(/[^\[]+?(?=\])/)[0]
          var key = dataId.replace(/[^\.]+?-/, '')
          if(typeof this._json.data[obj] === 'undefined' || this._json.data[obj] === null) this._json.data[obj] = []
          if(typeof this._json.data[obj][index] === 'undefined' || this._json.data[obj][index] === null) this._json.data[obj][index] = {}
          this._json.data[obj][index][key] = input.value
          var emptyObject = 0
          for(var prop in this._json.data[obj][index]) {
            if(this._json.data[obj][index][prop].trim() !== '') emptyObject++
          }
          if(emptyObject === 0) {
            delete this._json.data[obj][index]
          }
        }else {
          var value

          if (input.nodeName === 'SELECT') {
            var checked = input.querySelectorAll('option:checked')
            value = []
            Array.prototype.forEach.call(checked, (check) => {
              if(check.value !== '') {
                if(check.value.indexOf('{') > -1 || check.value.indexOf('[') > -1) {
                  value.push(JSON.parse(check.value))
                }else {
                  value.push(check.value)
                }
              }
            })
          }else if (input.getAttribute('data-autocomplete') === 'true') {
            var results = input.parentNode.querySelectorAll('.autocomplete-result-wrapper .autocomplete-result')
            value = []
            Array.prototype.forEach.call(results, (result) => {
              var val = result.getAttribute('value')
              if(val !== '') {
                if(val.indexOf('{') > -1 || val.indexOf('[') > -1) {
                  value.push(JSON.parse(val))
                }else {
                  value.push(val)
                }
              }
            })
          }else {
            value = input.value.replace(/\"/g, '\&quot;') + ''
          }
          this._json.data[dataId] = value
        }
      }
    })
  }

  savePage(type) {
    var target = document.querySelector(`[data-action="${type}"]`)
    this.serializeForm()
    target.classList.add('loading')
    target.setAttribute('disabled', 'disabled')

    this._json.save(this._saveType)
        .then((result) => {
          target.classList.add('done')
          // this._populateFromJson(this._json.data)
          if(result.success === 1) {
            CONFIG.TPLNAME = result.json.abe_meta.latest.abeUrl
            if(CONFIG.TPLNAME[0] === '/') CONFIG.TPLNAME = CONFIG.TPLNAME.slice(1)
          }

          var tplNameParam = '?tplName='
          var filePathParam = '&filePath='

          var getParams = window.location.search.slice(1).split('&')
          getParams.forEach(function (getParam) {
            var param = getParam.split('=')
            if(param[0] === 'filePath'){
              if(param[1].indexOf('-abe-') > -1){
                filePathParam += CONFIG.TPLNAME
              }
              else{
                filePathParam += param[1]
              }
            }
          })
          var ext = filePathParam.split('.')
          ext = ext[ext.length - 1]
          filePathParam = filePathParam.replace(new RegExp('-abe-(.+?)(?=\.' + ext + ')'), '')
          
          target.classList.remove('loading')
          target.classList.remove('done')
          target.removeAttribute('disabled')

          this._abeDisplayStatus.innerHTML = result.json.abe_meta.status
          if(result.success === 1) {
            window.json = result.json
          }
          var formWrapper = document.querySelector('#abeForm')
          Array.prototype.forEach.call(formWrapper.classList, (classStr) => {
            if(classStr.indexOf('status-') > -1) formWrapper.classList.remove(classStr)
          })
          formWrapper.classList.add('status-' + result.json.abe_meta.status)
          this.onFileSaved._fire()
        }).catch(function(e) {
          console.error(e)
        })
  }

  /**
   * Listen form submit and save page template 
   * @return {void}
   */
  _formSubmit() {
    this._abeForm.addEventListener('submit', (e) => {
      e.preventDefault()
      this.savePage(this._saveType)
    })
  }

  _submitClick(e) {
    this._saveType = e.currentTarget.getAttribute('data-action')
    if (this._saveType !== 'draft' && this._saveType !== 'reject') {
      this._abeFormRequired()
    }else {
      this._abeFormSubmit.click()
    }
  }

  _abeFormRequired() {
    var formGroups = [].slice.call(document.getElementById('abeForm').querySelectorAll('.form-group'))
    var valid = true

    Array.prototype.forEach.call(formGroups, (formGroup) => {
      var input = formGroup.querySelector('[data-required=true]')
      if(typeof input !== 'undefined' && input !== null) {
        var required = input.getAttribute('data-required')
        var autocomplete = input.getAttribute('data-autocomplete')
        if(typeof autocomplete !== 'undefined' && autocomplete !== null && (autocomplete === 'true' || autocomplete === true)) {
          var countValue = input.parentNode.querySelectorAll('.autocomplete-result')
          if (countValue.length <= 0) {
            formGroup.classList.add('has-error')
            valid = false
          }else {
            formGroup.classList.remove('has-error')
          }
        }else if(typeof required !== 'undefined' && required !== null && (required === 'true' || required === true)) {
          if (input.value === '') {
            formGroup.classList.add('has-error')
            valid = false
          }else {
            formGroup.classList.remove('has-error')
          }
        }
      }
    })

    if (valid) {
      this._abeFormSubmit.click()
    }else {
      alert('Required fields are missing')
    }
  }

  /**
   * populate all form and iframe html with json
   * @param  {Object} json object with all values
   * @return {null}
   */
  _populateFromJson(json) {
    this._json.data = json
    var forms = document.querySelectorAll('.form-abe')
    Array.prototype.forEach.call(forms, (form) => {
      var id = form.getAttribute('data-id')
      if(typeof id != 'undefined' && id !== null && typeof json[id] != 'undefined' && json[id] !== null) {
        var value = json[id]
        if(typeof value === 'object' && Object.prototype.toString.call(value) === '[object Array]') {
          value = JSON.stringify(value)
        }else if(typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]') {
          value = JSON.stringify(value)
        }
        form.value = value

        var node = IframeNode('#page-template', '[data-abe-' + id.replace(/\[([0-9]*)\]/g, '$1') + ']')[0]
        EditorUtils.formToHtml(node, form)
      }
    })
  }
}	