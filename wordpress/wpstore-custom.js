	
var previewPopupHtml = '<div id="customily-preview-container" class="modal" style="display:none;"><div id="preview-container"><img class="c-image" src=""><div class="customily-close-button"><p>X</p></div></div></div>'
var emptyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
var previewButtonHtml = '<div id="customily-preview-button" style="cursor:pointer;margin-bottom:1em;border-style:solid;border-width:1px;border-color:#2f80ed;border-radius:5px;padding:10px;color:black;text-align: center;">Preview Your Personalization</div>'

function insertPreviewContainer(selector) {
    jQuery(previewPopupHtml).insertAfter(selector)
    jQuery('#customily-preview-button').click(previewPersonalData)
    jQuery('.customily-close-button').click(function() {
        changePreviewVisibility(false)
    })
    jQuery('#customily-preview-container').click(function() {
        changePreviewVisibility(false)
    })
}

function changePreviewVisibility(show, selector) {
    jQuery(selector || '#customily-preview-container').css("display", show ? "block" : "none")
}

function previewPersonalData() {
    if (!window.customilyAllValid()) return
    var canvas = document.getElementById("preview-canvas");
    jQuery('#preview-container > img').attr("src", canvas.toDataURL());
    changePreviewVisibility(true)
}

function onChildNodeAdded(selector, callback) {
    const targetNode = document.querySelector(selector);
    if (!targetNode) return
    const observer = new MutationObserver(function(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                callback && callback(mutation)
            }
        }
    });
    observer.observe(targetNode, {
        childList: true,
        subtree: true
    });
}

function startLoadImage(parrent) {
    jQuery(parrent).find('img').each(function() {
        let dataSrc = jQuery(this).attr('data-src')
        if (dataSrc) {
            jQuery(this).attr('src', dataSrc)
        } else {
            let src = jQuery(this).attr('src')
            if (!src) {
                jQuery(this).attr('src', emptyImage)
            }
        }
    })
}

function addCustomilyCustom() {
    jQuery('#customily-options').ready(function() {
        let customilyRoot = this
        jQuery('img[src=""]').css('display', 'none');
        jQuery(previewButtonHtml).insertAfter('#customily-options')
        insertPreviewContainer('div.product-details-wrapper')
        onChildNodeAdded('#customily-options', function() {
            startLoadImage(customilyRoot)
        })
        startLoadImage(customilyRoot)
    })
}

function showPreviewImage(imgUrl) {
    console.log('imgUrl', imgUrl)
    if (!imgUrl) return
    jQuery('#preview-container > img').attr("src", imgUrl);
    changePreviewVisibility(true)
}

function addPreviewCartItemDesign() {
    jQuery('table.shop-table').ready(function() {
        insertPreviewContainer('div.woocommerce')
        jQuery(this).find('tbody > tr.cart_item > td.product-name').each(function() {
            let imgUrl = jQuery(this).find('dd.variation-Preview > p > a').attr('href')
            imgUrl = imgUrl.startsWith('\\"') ? imgUrl.substring(2, imgUrl.length - 2) : imgUrl
            let targetNode = jQuery(this).find('dl.tc-epo-metadata')
            let itemText = jQuery(this).find('dl.tc-epo-metadata > dd > p').map(function() {
                return jQuery(this).text()
            }).toArray().join(' | ')
            targetNode.append(jQuery(`<p>${itemText}</p>`))

            let previewEl = jQuery('<a class="preview-link">Preview Custom Design</a>')
            previewEl.click(function() {
                showPreviewImage(imgUrl)
            })
            targetNode.append(previewEl)
        })
    })
}

function fixVariantionCombination() {
    jQuery('form.variations_form').ready(function() {
        var productId = jQuery('form.variations_form').attr('data-product_id')
        let attrCount = {}
        let totalVariantCount = 1
        jQuery('table.variations > tbody > tr > td.value > select').each(function() {
            let hasValueCount = jQuery(this).find('option[value!=""]').size();
            if (hasValueCount == 1) jQuery(this).val(jQuery(this).find('option[value!=""]').first().attr('value'))
            let attrName = jQuery(this).attr('name')
            attrCount[attrName] = hasValueCount
            totalVariantCount *= hasValueCount
        })
        let attrNames = Object.keys(attrCount)
        let variantOptions = []
        let selectedOptionValue = {}
        jQuery('table.variations > tbody > tr > td.value > select').on('change', function(event) {
            if (variantOptions.length == 0 || variantOptions.length == totalVariantCount) return

            let {
                name,
                value
            } = event.target
            selectedOptionValue[name] = value
            let optionIndex = attrNames.indexOf(name);
            let preOptions = optionIndex >= 0 ? attrNames.slice(0, optionIndex + 1) : []
            let nextOptions = optionIndex >= 0 ? attrNames.slice(optionIndex + 1, attrNames.length) : []
            let valueByName = {}
            let enableVariants = variantOptions.filter(function(option) {
                return preOptions.every(preOption => {
                    return !selectedOptionValue[name] || option[name] === selectedOptionValue[name]
                })
            })
            for (let option of enableVariants) {
                for (let [key, value] of Object.entries(option)) {
                    if (!valueByName[key]) valueByName[key] = new Set()
                    valueByName[key]?.add(value)
                }
            }

            for (let [key, values] of Object.entries(valueByName)) {
                if (attrNames.indexOf(key) <= optionIndex) continue
                jQuery(`table.variations > tbody > tr > td.value > select[name="${key}"]`).each(function() {
                    let currSelect = this
                    let isSelectVisibleValue = true
                    let selectedValue = jQuery(this).children("option:selected").val();
                    let newSelectedValue, newSelectedOption

                    jQuery(this).children("option").each(function() {
                        let value = jQuery(this).attr('value')
                        let visible = values.has('') || values.has(value)
                        if (!visible && value === selectedValue) {
                            jQuery(currSelect).val('');
                            jQuery(currSelect).parents('tr.selected-variation').removeClass('selected-variation')
                            setTimeout(() => jQuery(currSelect).trigger('change'), 100)
                        }
                        jQuery(this).css('display', visible ? '' : 'none')
                    })
                })
            }
        });
        jQuery.post('?wc-ajax=get_variations', {
            product_id: productId
        }, function(result) {
            variantOptions = result || []
            variantOptions.length > 0 && jQuery('table.variations > tbody > tr > td.value > select:first').trigger('change')
        })
    })
}

function customSingleProductPage() {
    let iframeUrl
	
    jQuery('form.variations_form').ready(function() {
        let enableSizeGuide
        let sizeValues = []
        jQuery('tbody > tr').each(function() {
            let labelText = jQuery(this).find('td > label > span').text().replace(/\W/g, '').toLowerCase()
            if (labelText != 'size') return

            jQuery(this).find('td.value > select > option').each(function() {
                sizeValues.push(jQuery(this).text().trim().toLowerCase())
            })
            let sizeValueText = sizeValues.join()
            enableSizeGuide = sizeValues.length > 0 && !['cm', 'oz'].some(text => sizeValueText.endsWith(text)) 
                              && !['inch', '"', 'feet', 'pack'].some(text => sizeValueText.includes(text)) 
            if (enableSizeGuide) {
                let hashQueries = []
                jQuery(this).find('td > label > span').append('<a id="size-guide"> - <span><strong>Size Guide</strong> <i class="eicon-cursor-move"/></span></a>')
                jQuery('span.posted_in > a').each(function() {
                    hashQueries.push(jQuery(this).text())
                })
                jQuery(`
					<div class="gr-modal-overlay">
					  <div class="gr-modal">
						<a class="close-modal"><span style='font-size:24px'>×</span></a>
						<div class="modal-content"><iframe src="" class="gr-full-width-iframe"></iframe></div>
					</div>
					</div>
				`).insertAfter('div.product-details-wrapper')
                iframeUrl = 'https://wps.grexpress.net/redirect?q=size-guide&key=0YoSUH6bJ2nWagNRFeXs&hash=' + hashQueries.join(',')
                jQuery('#size-guide').click(function() {
                    jQuery('.gr-full-width-iframe').attr('src', iframeUrl)
                    jQuery('.gr-modal-overlay, .gr-modal').addClass('active')
                })
                jQuery('div.gr-modal > a.close-modal').click(function() {
                    jQuery('.gr-modal-overlay, .gr-modal').removeClass('active')
                });
                jQuery('div.gr-modal-overlay').click(function() {
                    jQuery('.gr-modal-overlay, .gr-modal').removeClass('active')
                })
            }
        })
    })
    
    jQuery('img.wp-post-image').each(function() {
		var img = new Image();
		img.onload = function() {
			jQuery('div.flex-viewport').css('height', '370px')
			jQuery('div.flex-viewport').css('margin-bottom', '25px')
			jQuery('figure.woocommerce-product-gallery__wrapper').css('display', '');
			jQuery('div.woocommerce-product-gallery.loading-placehoder').css('display', 'none');
			jQuery('.flex-control-thumbs').css({'max-height': '500px', 'margin-bottom': '20px'});
            if(iframeUrl) jQuery('.gr-full-width-iframe').attr('src', iframeUrl)
		}
		img.src = jQuery(this).attr('src');
	})

    jQuery('.related-wrapper').ready(function() {
        jQuery('.related-wrapper').detach().insertBefore(jQuery('.woocommerce-tabs'));
    })
}

function addChristmasNotice() {
	jQuery('div.summary > p.price').ready(function() {
		let html = `
		<div class="clear"></div>
		<div style="border-radius:10px;padding:10px;background:#fcf6ef;margin-top:10px;margin-bottom:-10px;"> 
		<p style="margin:0"> <b>Notice:</b> <span>The deadline for Christmas delivery has been passed.&nbsp;</span></p>
		</div>
		`
		jQuery(html).insertAfter('div.summary > p.price')
	})
}

jQuery(document).ready(function() {
    customSingleProductPage()
    addCustomilyCustom()
    addPreviewCartItemDesign()
    fixVariantionCombination()
	addChristmasNotice()
})

window.customilyAllValid = function() {
    let $ = jQuery
    if (!window.$cart_btn_clone.next().is('.cl_required_error')) {
        $('#cl_add_to_cart_fields_invalid').remove();
        window.$cart_btn_clone.after(
            '<br /><div id="cl_add_to_cart_fields_invalid" style="display: none" class="cl_required_error"> Some fields values are invalid. </div>'
        );
    }

    var valids = [];
    var $firstInvalid = false;

    $('.cl_inputs').each(function(i, e) {
        //never return false
        var $el = $(e);
        var $parent = $el.parents('._cl_field_group');

        if ($el.hasClass('cl_file_input') && !$el.hasClass('cl_vector_input')) {
            var index = window.cl_invalid_images_size.indexOf($el.attr('name'));
            if ($el.val()) {
                var imgWidth = parseInt($el.attr('cl-image-width'));
                var imgHeight = parseInt($el.attr('cl-image-height'));
                var minWidth = parseInt($el.attr('cl-min-width'));
                var minHeight = parseInt($el.attr('cl-min-height'));
                if (imgWidth < minWidth || imgHeight < minHeight) {
                    if (index < 0) {
                        window.cl_invalid_images_size.push($el.attr('name'));
                    }
                    $parent.addClass('img_size_error');
                    $firstInvalid = !$firstInvalid ? $parent : $firstInvalid;
                } else {
                    if (index >= 0) {
                        window.cl_invalid_images_size.splice(index);
                    }
                    $parent.removeClass('img_size_error');
                }
            } else if ($el.is('[cl-required=1]')) {
                $parent.addClass('error');
                $firstInvalid = !$firstInvalid ? $parent : $firstInvalid;
            }
        }

        if (!$el.is('[cl-required=1]')) {
            return true;
        }

        if ($el.is('[cl-dropdown]')) {
            valids.push($el.val());
            if (!$el.val()) {
                $parent.addClass('error');
                $firstInvalid = !$firstInvalid ? $parent : $firstInvalid;
            } else {
                $parent.removeClass('error');
            }
        } else if ($el.parent().is('.customily-swatch')) {
            var one_checked = $parent.find(':checked').length;
            valids.push(one_checked);
            if (!one_checked) {
                $parent.addClass('error');
                $firstInvalid = !$firstInvalid ? $parent : $firstInvalid;
            } else {
                $parent.removeClass('error');
            }
        } else {
            valids.push($el.val());
            if (!$el.val()) {
                $parent.addClass('error');
                $firstInvalid = !$firstInvalid ? $parent : $firstInvalid;
            } else {
                $parent.removeClass('error');
            }
        }
    });

    if ($firstInvalid && $firstInvalid.is('*')) {
        $('html, body').animate({
            scrollTop: $firstInvalid.offset().top - 60
        }, 500);
    }

    var all_valid = valids.every(function(val) {
        return !!val || (val && !!val.length);
    }) && !window.cl_invalid_images_size.length;
    all_valid ? $('.cl_required_error').hide() : $('.cl_required_error').show();
    return all_valid;
}
