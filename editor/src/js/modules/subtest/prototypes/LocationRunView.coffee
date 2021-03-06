class LocationRunView extends Backbone.View

  className: "LocationRunView"

  events:
    "click .clear" : "clearInputs"
    "change select" : "onSelectChange"

  initialize: (options) ->

    @model  = @options.model
    @parent = @options.parent

    @limit  = @options.limit

    @levels       = @model.get("levels")          || []
    @locationCols = @model.get("locationCols")    || []
    @locations    = @model.get("locations")       || []

    @selectedLocation = []

    @levels = @levels.slice(0, @limit) if @limit?

    if @levels.length == 1 && @levels[0] == ""
      @levels = []
    if @locationCols.length == 1 && @locationCols[0] == ""
      @locationCols = []
    if @locations.length == 1 && @locations[0] == ""
      @locations = []

    @levelColMap = []
    for level, i in @levels
      @levelColMap[i] = _.indexOf @locationCols, level
    @levelColMap = @levelColMap.slice(0, @limit) if @limit?

  clearInputs: ->
    @resetSelects(0)
    ""

  resetSelects: (index) ->
    for i in [index..@levels.length-1]
      @$el.find("#level_#{i}").html = "<option selected='selected' value='' disabled='disabled'>Please select a #{@levels[i]}</option>"
      @$el.find("#level_#{i}").val("")
      if i isnt 0 then @$el.find("#level_#{i}").attr("disabled", true)


  render: ->
    @$el.html "<div class='loc-container'></div>"
    @locView = new LocView
    @locView.setElement @$el.find(".loc-container")
    @trigger "rendered"
    @trigger "ready"


  onSelectChange: (event) ->
    @trigger "select-change"
    $target = $(event.target)
    levelChanged = parseInt($target.attr("data-level"))
    newValue = $target.val()
    nextLevel = levelChanged + 1
    if levelChanged isnt @levels.length-1
      @resetSelects(nextLevel+1)
      @$el.find("#level_#{nextLevel}").removeAttr("disabled")
      @$el.find("#level_#{nextLevel}").html @getOptions(nextLevel)
      @selectedLocation = []
    else
      levelVals = []
      for level, i in @levels
        levelVals.push @$el.find("#level_#{i}").val()

      matchCount = 0
      expectedCount = levelVals.length
      levelColMap = @levelColMap
      @selectedLocation = _.find(@locations, (arr) ->
        matchCount = 0
        for level, i in levelVals
          if arr[levelColMap[i]] is levelVals[i] then matchCount += 1
        return matchCount == expectedCount
      )
    ""


  getOptions: (index)->

    targetIndex = @levelColMap[index]

    doneOptions = []
    currentOptions = []
    levelOptions = ''

    parentValues = []
    for i in [0..index]
      break if i is index
      parentValues.push @$el.find("#level_#{i}").val()

    for location, i in @locations

      unless ~doneOptions.indexOf location[targetIndex]

        isNotChild = index is 0
        isValidChild = true
        for i in [0..Math.max(index-1,0)]

          if parentValues[i] isnt location[@levelColMap[i]]
            isValidChild = false
            break

        if isNotChild or isValidChild

          doneOptions.push location[targetIndex]
          currentOptions.push _(location[targetIndex]).escape()

    for locationName in _.sortBy(currentOptions, (el) -> return el)
      levelOptions += "
        <option value='#{locationName}'>#{locationName}</option>
      "

    return "
      <option selected='selected' value='' disabled='disabled'>Please select a #{@levels[index]}</option>
    " + levelOptions



  getResult: (filtered = false)->
    result =
      labels   : []
      location : []
    values = @locView.value()
    result.labels   = Object.keys values
    result.location = result.labels.map (el) -> values[el]
    return result

  getSkipped: ->
    return {
      "labels"   : (column.replace(/[\s-]/g,"_") for column in @locationCols)
      "location" : ("skipped" for locationCols in @locationCols)
    }


  isValid: ->
    @$el.find(".message").remove()
    selects = @$el.find("select")
    for input, i in selects
      return false if _($(input).val()).isEmptyString()

    return false if @selectedLocation == []
    true

  showErrors: ->
    selects = @$el.find("select")
    for input in selects
      if _($(input).val()).isEmptyString()
        $(input).after " <span class='message'>#{$('label[for='+$(input).attr('id')+']').text()} must be filled.</span>"

  onClose: ->
    @locView.remove()

  getSum: ->
    counts =
      correct   : 0
      incorrect : 0
      missing   : 0
      total     : 0
      
    for input in @$el.find("input")
      $input = $(input)
      counts['correct']   += 1 if ($input.val()||"") != ""
      counts['incorrect'] += 0 if false
      counts['missing']   += 1 if ($input.val()||"") == ""
      counts['total']     += 1 if true

    return {
      correct   : counts['correct']
      incorrect : counts['incorrect']
      missing   : counts['missing']
      total     : counts['total']
    }
