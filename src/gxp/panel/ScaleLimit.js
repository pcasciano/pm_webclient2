/**
 * @requires slider/Tip.js
 */

Ext.define('gxp.panel.ScaleLimit', {
    extend: 'Ext.panel.Panel',
    requires: ['gxp.slider.Tip'],
    alias: 'widget.gxp_scalelimitpanel',
    maxScaleDenominatorLimit: 40075016.68 * 39.3701 * OpenLayers.DOTS_PER_INCH / 256,
    limitMaxScaleDenominator: true,
    minScaleDenominatorLimit: Math.pow(0.5, 19) * 40075016.68 * 39.3701 * OpenLayers.DOTS_PER_INCH / 256,
    limitMinScaleDenominator: true,
    scaleLevels: 20,
    scaleSliderTemplate: "{scaleType} Scale 1:{scale}",
    modifyScaleTipContext: Ext.emptyFn,
    scaleFactor: null,
    changing: false,
    border: false,
    maxScaleLimitText: "Max scale limit",
    minScaleLimitText: "Min scale limit",
    initComponent: function() {

        this.layout = "column";

        this.defaults = {
            border: false,
            bodyStyle: "margin: 0 5px;"
        };
        this.bodyStyle = {
            padding: "5px"
        };

        this.scaleSliderTemplate = Ext.create('Ext.Template', this.scaleSliderTemplate);

        Ext.applyIf(this, {
            minScaleDenominator: this.minScaleDenominatorLimit,
            maxScaleDenominator: this.maxScaleDenominatorLimit
        });

        this.scaleFactor = Math.pow(
            this.maxScaleDenominatorLimit / this.minScaleDenominatorLimit,
            1 / (this.scaleLevels - 1)
        );

        this.scaleSlider = Ext.create('Ext.Slider', {
            vertical: true,
            height: 100,
            columnWidth: 0.1,
            values: [0, 100],
            listeners: {
                changecomplete: function(slider, value) {
                    this.updateScaleValues(slider);
                },
                render: function(slider) {
                    slider.thumbs[0].el.setVisible(this.limitMaxScaleDenominator);
                    slider.thumbs[1].el.setVisible(this.limitMinScaleDenominator);
                    slider.setDisabled(!this.limitMinScaleDenominator && !this.limitMaxScaleDenominator);
                },
                scope: this
            },
            plugins: [Ext.create('gxp.slider.Tip', {
                getText: Ext.bind(function(thumb) {
                    var index = thumb.slider.thumbs.indexOf(thumb);
                    var value = thumb.value;
                    var scales = this.sliderValuesToScale([thumb.value]);
                    var data = {
                        scale: String(scales[0]),
                        zoom: (thumb.value * (this.scaleLevels / 100)).toFixed(1),
                        type: (index === 0) ? "Max" : "Min",
                        scaleType: (index === 0) ? "Min" : "Max"
                    };
                    this.modifyScaleTipContext(this, data);
                    return this.scaleSliderTemplate.apply(data);
                }, this)
            })]
        });

        this.maxScaleDenominatorInput = Ext.create('Ext.form.NumberField', {
            minValue: 0,
            hideTrigger: true,
            keyNavEnabled: false,
            mouseWheelEnabled: false,
            fieldLabel: "1",
            value: Math.round(this.maxScaleDenominator),
            disabled: !this.limitMaxScaleDenominator,
            validator: Ext.bind(function(value) {
                return !this.limitMinScaleDenominator || (value > this.minScaleDenominator);
            }, this),
            listeners: {
                validitychange: function(field) {
                    var value = Number(field.getValue());
                    var limit = Math.round(this.maxScaleDenominatorLimit);
                    if(value < limit && value > this.minScaleDenominator) {
                        this.maxScaleDenominator = value;
                        this.updateSliderValues();
                    }
                },
                change: function(field) {
                    var value = Number(field.getValue());
                    var limit = Math.round(this.maxScaleDenominatorLimit);
                    if(value > limit) {
                        field.setValue(limit);
                    } else if(value < this.minScaleDenominator) {
                        field.setValue(this.minScaleDenominator);
                    } else {
                        this.maxScaleDenominator = value;
                        this.updateSliderValues();
                    }
                },
                scope: this
            }
        });
        this.minScaleDenominatorInput = Ext.create('Ext.form.NumberField', {
            minValue: 0,
            hideTrigger: true,
            keyNavEnabled: false,
            mouseWheelEnabled: false,
            fieldLabel: "1",
            value: Math.round(this.minScaleDenominator),
            disabled: !this.limitMinScaleDenominator,
            validator: Ext.bind(function(value) {
                return !this.limitMaxScaleDenominator || (value < this.maxScaleDenominator);
            }, this),
            listeners: {
                validitychange: function(field) {
                    var value = Number(field.getValue());
                    var limit = Math.round(this.minScaleDenominatorLimit);
                    if(value > limit && value < this.maxScaleDenominator) {
                        this.minScaleDenominator = value;
                        this.updateSliderValues();
                    }
                },
                change: function(field) {
                    var value = Number(field.getValue());
                    var limit = Math.round(this.minScaleDenominatorLimit);
                    if(value < limit) {
                        field.setValue(limit);
                    } else if(value > this.maxScaleDenominator) {
                        field.setValue(this.maxScaleDenominator);
                    } else {
                        this.minScaleDenominator = value;
                        this.updateSliderValues();
                    }
                },
                scope: this
            }
        });
        this.items = [this.scaleSlider, {
            xtype: "panel",
            columnWidth: 0.9,
            layout: "form",
            defaults: {border: false},
            items: [{
                labelWidth: 90,
                layout: "form",
                width: 150,
                items: [{
                    xtype: "checkbox",
                    checked: !!this.limitMinScaleDenominator,
                    fieldLabel: this.maxScaleLimitText,
                    listeners: {
                        change: function(box, checked) {
                            this.limitMinScaleDenominator = checked;
                            var slider = this.scaleSlider;
                            slider.setValue(1, 100);
                            slider.thumbs[1].el.setVisible(checked);
                            this.minScaleDenominatorInput.setDisabled(!checked);
                            this.updateScaleValues(slider);
                            slider.setDisabled(!this.limitMinScaleDenominator && !this.limitMaxScaleDenominator);
                        },
                        scope: this
                    }
                }]
            }, {
                labelWidth: 10,
                layout: "form",
                maxWidth: 200,
                items: [this.minScaleDenominatorInput]
            }, {
                labelWidth: 90,
                layout: "form",
                items: [{
                    xtype: "checkbox",
                    checked: !!this.limitMaxScaleDenominator,
                    fieldLabel: this.minScaleLimitText,
                    listeners: {
                        change: function(box, checked) {
                            this.limitMaxScaleDenominator = checked;
                            var slider = this.scaleSlider;
                            slider.setValue(0, 0);
                            slider.thumbs[0].el.setVisible(checked);
                            this.maxScaleDenominatorInput.setDisabled(!checked);
                            this.updateScaleValues(slider);
                            slider.setDisabled(!this.limitMinScaleDenominator && !this.limitMaxScaleDenominator);
                        },
                        scope: this
                    }
                }]
            }, {
                labelWidth: 10,
                layout: "form",
                maxWidth: 200,
                items: [this.maxScaleDenominatorInput]
            }]
        }];

        this.addEvents(
            "change"
        );
        this.callParent(arguments);
    },
    updateScaleValues: function(slider) {
        if(!this.changing) {
            var values = slider.getValues();
            var resetSlider = false;
            if(!this.limitMaxScaleDenominator) {
                if(values[0] > 0) {
                    values[0] = 0;
                    resetSlider = true;
                }
            }
            if(!this.limitMinScaleDenominator) {
                if(values[1] < 100) {
                    values[1] = 100;
                    resetSlider = true;
                }
            }
            if(resetSlider) {
                slider.setValue(0, values[0]);
                slider.setValue(1, values[1]);
            } else {
                var scales = this.sliderValuesToScale(values);
                var max = scales[0];
                var min = scales[1];
                this.changing = true;
                this.minScaleDenominatorInput.setValue(min);
                this.maxScaleDenominatorInput.setValue(max);
                this.changing = false;
                this.fireEvent(
                    "change", this,
                    (this.limitMinScaleDenominator) ? min : undefined,
                    (this.limitMaxScaleDenominator) ? max : undefined
                );
            }
        }
    },
    updateSliderValues: function() {
        if(!this.changing) {
            var min = this.minScaleDenominator;
            var max = this.maxScaleDenominator;
            var values = this.scaleToSliderValues([max, min]);
            this.changing = true;
            this.scaleSlider.setValue(0, values[0]);
            this.scaleSlider.setValue(1, values[1]);
            this.changing = false;
            this.fireEvent(
                "change", this,
                (this.limitMinScaleDenominator) ? min : undefined,
                (this.limitMaxScaleDenominator) ? max : undefined
            );
        }
    },
    sliderValuesToScale: function(values) {
        var interval = 100 / (this.scaleLevels - 1);
        return [Math.round(Math.pow(this.scaleFactor, (100 - values[0]) / interval) * this.minScaleDenominatorLimit),
                Math.round(Math.pow(this.scaleFactor, (100 - values[1]) / interval) * this.minScaleDenominatorLimit)];
    },
    scaleToSliderValues: function(scales) {
        var interval = 100 / (this.scaleLevels - 1);
        return [100 - (interval * Math.log(scales[0] / this.minScaleDenominatorLimit) / Math.log(this.scaleFactor)),
                100 - (interval * Math.log(scales[1] / this.minScaleDenominatorLimit) / Math.log(this.scaleFactor))];
    }
});
