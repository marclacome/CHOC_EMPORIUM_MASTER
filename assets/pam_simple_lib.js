/*
USEFUL INTERNAL STUFF
DISPLAYS
EDIT BAGS
 AJAX
 */



function dm(val) {
    return;
    console.log('---' + val);
}



var PAM = new function () {

    var self = this;
    var selected_bag_id;
    var gift_wrap_id;
    var gift_wrapped_line_item_to_remove;
    var cart;
    var pre_ajax_obj;
    var is_busy;
    var PAM_STR;
    var liquid_template;
    var max_products_per_bag;

    var giftwrap_display;
    var tag_id;
    var tag_display;
    var message_display;
    var free_gift_tag_title;
    var min_pam_per_bag;
    var combine_packaging;

    var run_auto_test;
    var developer_mode;

    this.init = function (liquid_template, min_pam_per_bag, developer_mode) {
        self.doLogging = true;
        self.logging = [];
        window.innerShiv = function () { console.log('a'); return false; };
        self.PAM_STR = '';
        self.min_pam_per_bag = min_pam_per_bag;
        self.is_busy = false;
        dm('PAM init');
        self.cart = null;
        self.liquid_template = liquid_template;
        self.combine_packaging = false;
        self.developer_mode = developer_mode;

/*
        $(window).bind('beforeunload', function () {
            if (self.is_busy)
                return 'We are busy sending data to the server. If you leave the page now then the data may be incomplete. Do you really want to leave?';
        });
        */

        $('.pam-quantity-minus').each(function () {
            $(this).bind("click", function () {
                var this_id = this.id.replace('pam-quantity-minus-', '');
                var quantity = parseInt($('#' + this_id + '_bag_quantity').val(), 10) - 1;
                if (quantity == 0)
                    return;
                $('#' + this_id + '_bag_quantity').val(quantity);
            });
        });

        $('.pam-quantity-plus').each(function () {
            $(this).bind("click", function () {
                var this_id = this.id.replace('pam-quantity-plus-', '');
                var quantity = parseInt($('#' + this_id + '_bag_quantity').val(), 10) + 1;
                $('#' + this_id + '_bag_quantity').val(quantity);
            });
        });

        self.run_auto_test = false;
        PAM_ajax_get_cart();

        if (self.developer_mode)
            console.log("*************** DEVELOPER MODE IS ON **************")
    }

    //for development
    this.clearBags = function () {
        PAM_set_bag_str(null);
        PAM_ajax_update_cart_attrib(PAM_get_bag_str());
    }

    this.submitCart = function () {
        var str = PAM_create_pam_final(true);


        if (str.length) {
            str += "#";
            $('#note_string').val(str);
            var params = {
                type: 'POST',
                url: '/cart/update.js',
                data: 'attributes[PAM_README]=' + encodeURIComponent(str),
                dataType: 'json',
                success: function () {
                    $('#checkout').click();

                },
                error: function (err) {
                    self.onAjaxError(err, 100);
                    show_message("Sorry - something went wrong submitting your order. Please try again. If the problem persists please email us", function () { hide_all_popups(); });
                }
            }
            self.PAM_log(100);
            jQuery.ajax(params);
        }
        else
            $('#checkout').click();
    };


    this.show_techie = function () {
        if (PAM_get_bag_str().length == 0) {
            console.log('TECHIE - no bag str');
            return;
        }
        console.log(PAM_get_bag_str());
        var str = 'BAGS - \r\n';
        var obj = PAM_get_bag_object();
        $(obj.bags).each(function () {
            var bag_id = -1;
            $(this.bag_ar).each(function () {
                str += "\r\n.........\r\n";
                str += this.name + " ";
                bag_id = this.id;
            });
            if (bag_id != -1) {
                str += "\r\n.........\r\n";
                $(this.products).each(function () {
                    var product_data = PAM_product_data_from_id(this.product_id);
                    if (product_data)
                        str += product_data.title + "\t" + this.quantity + "\r\n";
                });
            }
        });

        str += "\r\n......... GIFT MESSAGES \r\n";
        $(obj.bags).each(function () {
            $(this.bag_ar).each(function () {
                str += this.name + "\r\n";
                str += this.message + "\r\n\r\n";
            });
        });

        console.log(str);
    }

    /*********** USEFUL INTERNAL STUFF ***************/


    var PAM_set_bag_str = function (obj) {
        if (obj == null) {
            obj = { 'logging': "" }
            self.PAM_STR = '';
        }
        else {
            obj.logging = JSON.stringify(self.logging);
            $(obj.bags).each(function () {
                $(this.bag_ar).each(function () {
                    var do_encode = false;
                    if (this.encoded == undefined)
                        do_encode = true;
                    else if (this.encoded.indexOf('&') != -1)
                        do_encode = true;
                    if (do_encode) {
                        this.name = encodeURIComponent(this.name);
                        this.message = encodeURIComponent(this.message);
                        this.encoded = encodeURIComponent(this.encoded);
                    }
                });
            });
            console.log("logging " + obj.logging)
            self.PAM_STR = JSON.stringify(obj);
        }
    }

    this.PAM_log = function (val) {
        if (!self.doLogging)
            return;
        if (self.logging.length > 120)
            self.logging = self.logging.slice(-120);
        self.logging.push(val);
    }

    var PAM_get_bag_str = function () {
        return self.PAM_STR;
    }

    var PAM_get_bag_object = function () {
        var pam_str = PAM_get_bag_str();
        if (pam_str.trim().length == 0)
            return null;
        var obj = jQuery.parseJSON(pam_str);
        return obj;
    }

    /* since we store only id for each product in the bags object, we need to search the cart.items to
    find the product title, price etc
    */
    var PAM_product_data_from_id = function (product_id) {
        var ret = null;
        $(self.cart.items).each(function () {
            if (this.variant_id == product_id)
                ret = this;
        });
        return ret;
    }


    /* list all the products for this bag
    if the obj param is null then the return is a new array (for display only)
    else we return the actual array from the master_bags object (for editing product quantity)
    */
    var PAM_get_products_for_bag = function (obj, bag_id) {
        var ar = new Array();
        if (obj == null)
            obj = PAM_get_bag_object();
        $(obj.bags).each(function () {
            var bag_obj = this;
            $(this.bag_ar).each(function () {
                if (this.id == bag_id)
                    ar = bag_obj.products;
            });
        });
        return ar;
    }

    var PAM_get_selected_bag = function (obj) {
        var bag_id = obj.selected;
        var return_obj = undefined;
        $(obj.bags).each(function () {
            var bagar = this.bag_ar;
            $(this.bag_ar).each(function () {
                if (this.id == bag_id)
                    return_obj = this;
            });
        });
        return return_obj;
    }

    //just change the page display so we show the text entry fields, not the
    //grid of pam products
    this.show_new_bag_popup = function () {
        if (self.liquid_template.indexOf('pam-template') == -1)
            return;
        hide_all_popups();
        $('#popup-mask').css('display', 'block');
        $('#popupBoxPamNameWrapper').css('display', 'block');
        $(window).scrollTop(0);
    }



    this.show_offer_gift_wrap = function () {
        var item_count = 0;
        var obj = PAM_get_bag_object();
        var bag_obj = PAM_get_selected_bag(obj);
        var bag_products = PAM_get_products_for_bag(null, obj.selected);


        $(obj.bags).each(function () {
            var bag_obj = this;
            $(this.bag_ar).each(function () {
                if (this.id == obj.selected) {
                    $(bag_obj.products).each(function () {
                        item_count += parseInt(this.quantity, 10);
                    });
                }
            });
        });

        if (bag_products.length == 0) {
            show_message('There are no products in your bag!', function () { hide_all_popups(); });
            return;
        }
        if (this.min_pam_per_bag > 0) {
            if (item_count < this.min_pam_per_bag) {
                show_message('You must add at least ' + this.min_pam_per_bag + ' products to your bag', function () { hide_all_popups(); });
                return;
            }
        }

        var options_obj_str = $('#pam_gift_wrap_options').val();
        var options_obj = JSON.parse(options_obj_str);

        var options_filter_str = $('#pam_gift_wrap_filter').val();
        options_filter_str = options_filter_str.replace('[', '');
        options_filter_str = options_filter_str.replace(']', '');
        options_filter_str = options_filter_str.replace(/-/g, '=');

        var options_filter_raw = options_filter_str.split('=');
        var i = 1;
        var options_filter = new Array();
        var found = false;
        var found_ar;

        for (i = 1; i < options_filter_raw.length; i += 2) {
            var limit = parseInt(options_filter_raw[i], 10);
            if (!found) {
                if (item_count <= limit) {
                    found_ar = options_filter_raw[i + 1].split(',');
                    found = true;
                }
            }
        }

        var free_str = "";
        $(options_obj).each(function () {
            if (this.barcode == 'FREE-GIFTWRAP')
                free_str = this.title;
        });

        if (!found) {
            self.show_offer_gift_message(-1, '"' + free_str + '"');
            return;
        }

        var str = "<table>";
        str += "<tr onclick='PAM.show_offer_gift_message(-1, " + '"' + free_str + '"' + ")'><td>" + free_str + "</td><td class='giftwrap-img'><img src='" + $('#free_giftwrap_image').val() + "'></td><td>Free</td></tr>";
        $(found_ar).each(function () {
            var outer = this;
            $(options_obj).each(function () {
                if (outer == this.barcode)
                    str += '<tr onclick="PAM.show_offer_gift_message(' + this.id + ",'" + this.title + "'" + ')"><td>' + this.title + "</td><td class='giftwrap-img'><img src='" + this.image + "'></td><td>" + this.price + "</td></tr>";
            });
        });

        str += "</table>";
        $('#pam_giftwrap_table').html(str);

        $('#popupBoxPamWrap_details').html('Pick and Mix Selection: ' + decodeURIComponent(bag_obj.name));
        $('#popupBoxWrapper').css('display', 'block');
        $('#popup-mask').css('display', 'block');
        $(window).scrollTop(0);
    }

    this.show_offer_gift_message = function (gift_wrap_id, gift_wrap_display_name) {
        var obj = PAM_get_bag_object();
        if (obj.selected == -1)
            return;
        var selected_bag_obj = PAM_get_selected_bag(obj);
        self.giftwrap_display = gift_wrap_display_name;
        self.gift_wrap_id = gift_wrap_id;
        $('#pam_gift_message_textarea').val("");
        $('#popupBoxMessage_details').html('Pick and Mix Selection ' + decodeURIComponent(selected_bag_obj.name) + ' | Giftwrap: ' + gift_wrap_display_name);
        $('#popup-mask').css('display', 'block');
        $('#popupBoxWrapper').css('display', 'none');
        $('#popupBoxMessageWrapper').css('display', 'block');
        $(window).scrollTop(0);
    }

    this.handle_giftwrap_click = function () {
        var tag_id = 'none_selected';
        $('.popup_radio').each(function () {
            if (this.checked)
                tag_id = this.id;
        });
        if (tag_id == 'none_selected') {
            show_message('Please select a gift tag option', function () { hide_all_popups(); });
            //  alert('Please select a gift tag option');
            return;
        }
        if (tag_id == 'tag_none') {
            self.message = "";
            self.ajax_complete_bag('tag_none', "");
        }
        else
            self.ajax_complete_bag(tag_id, $('#popup_description_' + tag_id).html());
    }


    this.ajax_complete_bag = function (tag_id, tag_description) {
        if (self.is_busy)
            return;
        self.is_busy = true;

        self.tag_id = tag_id;
        self.tag_display = tag_description;
        $('#popupBoxMessageWrapper').css('display', 'none');
        $('#popupBoxGiftWrapWrapper').css('display', 'none');
        $('#popup-mask').css('display', 'none');

        var obj = PAM_get_bag_object();
        if (obj.selected == -1)
            return;

        var selected_bag_obj = PAM_get_selected_bag(obj);
        var confirmation_display_name = selected_bag_obj.name;
        if (tag_id != 'tag_none') {
            selected_bag_obj.message = clean_message_str($('#pam_gift_message_textarea').val());
        }
        else {
            selected_bag_obj.message = '';
        }
        self.message_display = selected_bag_obj.message;
        //if giftwrap and/or tag selected, these are products. add to this bag (so cart adjust quantity will be correct)
        if ((self.gift_wrap_id != -1) || ((tag_id != 'tag_none') && (tag_id != 'gift_tag_free'))) {
            var bag_products = PAM_get_products_for_bag(obj, obj.selected);
            if (self.gift_wrap_id != -1)
                bag_products.push({ "product_id": self.gift_wrap_id, "quantity": 1 });
            if ((tag_id != 'tag_none') && (tag_id != 'gift_tag_free')) {
                bag_products.push({ "product_id": tag_id, "quantity": 1 });
            }
        }
        if (tag_id == 'gift_tag_free')
            selected_bag_obj.tag_id = tag_id;


        // set obj.selected to -1 so we have no open bag
        obj.selected = -1;
        PAM_set_bag_str(obj);
        //if giftwrap and/or tag selected, these are products. add to cart like a normal product purchase
        var data_str = 'attributes[PAM_STR]=' + PAM_get_bag_str();
        if ((self.gift_wrap_id != -1) || (tag_id != 'tag_none')) {
            data_str = 'attributes[PAM_STR]=' + PAM_get_bag_str();
            /* increment count for this giftwrap */
            if (self.gift_wrap_id != -1) {
                var new_quantity = 1;
                $(self.cart.items).each(function () {
                    if (this.variant_id == self.gift_wrap_id)
                        new_quantity += this.quantity;
                });
                data_str += '&updates[' + self.gift_wrap_id + ']=' + new_quantity;
            }
            if ((tag_id != 'tag_none') && (tag_id != 'gift_tag_free')) {
                var new_quantity = 1;
                $(self.cart.items).each(function () {
                    if (this.variant_id == tag_id)
                        new_quantity += this.quantity;
                });
                data_str += '&updates[' + tag_id + ']=' + new_quantity;
            }
        }
        /*******************************************************************************/
        var params = {
            type: 'POST',
            url: '/cart/update.js',
            data: data_str,
            dataType: 'json',
            success: function (cart) {
                self.cart = cart;
                self.is_busy = false;
                $('#popupBoxConfirmation_details').html(self.make_confirmation_message(confirmation_display_name));
                show_pam_confirmation();
                self.check_pam_quantities(cart);
            },
            error: function (err) {
                self.onAjaxError(err, 0);
            }
        };
        self.PAM_log(0);
        jQuery.ajax(params);
    }

    this.make_confirmation_message = function (bag_name) {
        var str = "Pick and Mix Selection: " + bag_name + " | Giftwrap: " + self.giftwrap_display;
        if (self.message_display.length) {
            var m = self.message_display.replace(/<br\/>/g, '\r\n');
            m = m.replace(/<BR\/>/g, '\r\n');
            m = m.replace(/<br \/>/g, '\r\n');
            m = m.replace(/<BR \/>/g, '\r\n');
            str += " | Message: " + m;
        }
        if (self.tag_id != 'tag_none')
            str += " | Gift Tag: " + self.tag_display;
        str += " has been added to your basket";
        str = decodeURIComponent(str);
        return str;
    }

    this.show_pick_and_mix_page = function () {
        if (self.liquid_template.indexOf('pam-template') == -1)
            return;
        hide_all_popups();
        $('#PAM-bag-complete').css('display', 'none');
        $('#PAM-fill-bag').css('display', 'block');
    }

    this.get_giftwrap_id = function (bag_id) {
        var gift_wrap_id = -1;
        var gift_wrap_id_list = $('#gift_wrap_ids').val();
        var prods = PAM_get_products_for_bag(null, bag_id);
        $(prods).each(function () {
            if (gift_wrap_id_list.indexOf(this.product_id) != -1)
                gift_wrap_id = this.product_id;
        });
        return gift_wrap_id;
    }

    this.get_tag_id = function (obj, bag_id) {
        var tag_id = 'tag_none';
        var tag_id_list = $('#tag_ids').val();
        var prods = PAM_get_products_for_bag(null, bag_id);
        $(prods).each(function () {
            if (tag_id_list.indexOf(this.product_id) != -1)
                tag_id = this.product_id;
        });
        if (tag_id == 'tag_none') {
            $(obj.bags).each(function () {
                var bag_obj = this;
                $(this.bag_ar).each(function () {
                    if (tag_id == 'tag_none') {
                        if (this.id == bag_id) {
                            if (this.tag_id != undefined)
                                tag_id = this.tag_id;
                        }
                    }
                });
            });
        }
        return tag_id;
    }

    /************ DISPLAYS *************/

    var PAM_do_bag_display = function () {
        if (self.liquid_template.indexOf('pam-template') == -1)
            return;
        var str = '';
        var obj = PAM_get_bag_object();
        var sel_bag = PAM_get_selected_bag(obj);
        var gift_wrap_id = self.get_giftwrap_id(obj.selected);

        var this_name;
        var str = '<div class="pam-bag-description">';
        str += '<span>' + decodeURIComponent(sel_bag.name) + '</span><br />';
        str += '</div>';
        str += '</div><!--close pam-panel-->';

        str += '<div class="pam-panel">';
        str += '<h3>YOUR MIX:</h3>';
        var quantity = 0;
        var prods = PAM_get_products_for_bag(null, obj.selected);

        if ((prods.length == 0) || ((prods.length == 1) && (gift_wrap_id != -1)))
            str += '<h3>THIS BAG IS EMPTY</h3>';
        else {
            $(prods).each(function () {
                var prod_data = PAM_product_data_from_id(this.product_id);
                if ((prod_data) && (prod_data.id != gift_wrap_id)) {
                    quantity += this.quantity;
                    str += '<div class="pam-bag-item"><table><tr>';
                    str += '<td width="25%"><img class="pam-bag-img" src="' + prod_data.image + '"></td>';
                    str += '<td><span class="pam-item-qty">' + this.quantity + 'x</span>' + prod_data.title + '</td>';
                    str += '<td width="10%"><span class="pam-item-remove" onclick="PAM.ajax_remove_from_bag(' + "'" + this.product_id + "', " + this.quantity + ')">x</span></td>';
                    str += '</tr></table></div>';
                }
            });
            str += '</div>';
        }

        str += '<div class="pam-total">BAG TOTAL:<span class="pam-total-price">';
        str += PAM_calculate_cost_for_bag(obj.selected);
        str += '</span></div>';
        /* V6 message to say must have n items in bag */
        if ((self.min_pam_per_bag > 0) || (quantity < self.min_pam_per_bag))
            str += '<div id="min_bag_quantity_message">(Your bag must contain at least ' + self.min_pam_per_bag + ' items)</div>';
        str += '<input type="button" value="Complete this bag" onclick="PAM.show_offer_gift_wrap()" class="pam-panel-btn btn">';
        $('#PAM-bags-existing').html(str);
    }


    /*list bags at top of the ajaxify cart
     * only called from ajax_get_cart
     */
    var PAM_do_cart_display = function () {
        if (self.liquid_template.indexOf('cart') == -1)
            return;
        var obj = PAM_get_bag_object();
        var str = "";
        var count = 0;
        $(obj.bags).each(function () {
            $(this.bag_ar).each(function () {
                {
                    count++;
                    if ((count % 2) != 0)
                        str += '<div class="grid"><!--this is the outer containing grid for each row of pam bags-->';
                    str += '<div class="grid-item large--one-half">';
                    str += ' <div class="pam-cart">';
                    str += '<table>';
                    str += '<tr><td width="10%">';
                    if (this.id != obj.selected)
                        str += '<img src="//cdn.shopify.com/s/files/1/0908/2146/t/7/assets/icon-bag-closed.png?v=12093143247729148242">';
                    else
                        str += '<img src="//cdn.shopify.com/s/files/1/0908/2146/t/7/assets/icon-bag-open.png?v=8487822902428026514">';
                    str += '</td>';
                    str += "<td class='breakword'>" + decodeURIComponent(this.name) + "</td>";
                    str += "<td width='15%'><span class='pam-item-price'>" + PAM_calculate_cost_for_bag(this.id) + "</span></td>";
                    str += "<td width='22%' onclick='PAM.inspect_bag(" + '"' + this.id + '")' + "'><span id='more_" + this.id + "'>Bag details</span> <span class='icon icon-arrow-down'></span></td>";
                    str += "<td width='5%' onclick='PAM.delete_bag(" + '"' + this.id + '")' + "'><span class='pam-item-remove'>x</span></td></tr>";
                    var products = PAM_get_products_for_bag(null, this.id);
                    if (products.length == 0)
                        str += '<tr><td colspan="5">This bag is empty</td></tr>';
                    else if (this.id == obj.selected) {
                        str += '<tr><td colspan="5">You can add a Gift Tag to this bag</td></tr>';
                        str += '<tr><td colspan="5">Return to the <a href="/collections/pick-and-mix?view=pam-template-paginate">Pick and Mix</a> page to complete the bag</td></tr>';
                    }
                    str += '</table>';
                    str += "<div id='product_list_" + this.id + "'></div>";
                    str += '</div>';
                    str += '</div>';

                    if ((count % 2) == 0)
                        str += '</div>';
                }
            });
        });
        if ((count % 2) != 0)
            str += '</div>';
        str += '</div>';

        if (obj.bags.length) {
            $('#PAM-cart-pick-and-mix-title').css('display', 'block');
            $('#PAM-cart-display').html(str);
            $('#PAM-cart-display').css('display', 'block');
        }
        else {
            $('#PAM-cart-pick-and-mix-title').css('display', 'none');
            $('#PAM-cart-display').css('display', 'none');
        }

        PAM_adjust_cart_quantities();
    }

    //click on a bag in the cart to list the products in that bag
    this.inspect_bag = function (bag_id) {
        var do_expand = $('#product_list_' + bag_id).html().length == 0;
        //remove product list from any other bag (if user already clicked 'more' on another bag)
        var obj = PAM_get_bag_object();
        $(obj.bags).each(function () {
            $(this.bag_ar).each(function () {
                $('#product_list_' + this.id).html('');
                $('#more_' + this.id).html('Bag details');
            });
        });

        if (do_expand) {
            $('#more_' + bag_id).html('Hide details');
            var message = "";
            var gift_wrap_id = self.get_giftwrap_id(bag_id);
            var tag_id = self.get_tag_id(obj, bag_id);

            $(obj.bags).each(function () {
                $(this.bag_ar).each(function () {
                    if (this.id == bag_id)
                        message = decodeURIComponent(this.message);
                });
            });
            var products = PAM_get_products_for_bag(null, bag_id);

            var str = '<div class="pam-cart-bag-details"><table class="messages">';
            if (message.length)
                str += '<tr><td width="30%">MESSAGE</td><td><span  class="breakword">' + message + '</span></td></tr>';
            if (gift_wrap_id != -1) {
                var prod_data = PAM_product_data_from_id(gift_wrap_id);
                str += '<tr><td width="30%">GIFT WRAP</td><td>' + prod_data.title + '</td></tr>';
            }
            else
                str += '<tr><td width="30%">GIFT WRAP</td><td>' + $('#pam_free_giftwrap_details').val() + '</td></tr>';
            if (tag_id != 'tag_none') {
                var prod_data = "";
                if (tag_id == 'gift_tag_free')
                    str += '<tr><td width="20%">GIFT TAG</td><td>' + $('#gift_tag_free_title').val() + '</td></tr>';
                else {
                    prod_data = PAM_product_data_from_id(tag_id);
                    str += '<tr><td width="20%">GIFT TAG</td><td>' + prod_data.title + '</td></tr>';
                }
            }
            str += '</table>';

            $(products).each(function () {
                var product_data = PAM_product_data_from_id(this.product_id);
                if ((product_data) && (product_data.id != gift_wrap_id) && (product_data.id != tag_id)) {
                    str += '<table class="pam-cart-bag-contents">';
                    str += '<tr><td width="20%"> <img  src="' + product_data.image + '"></td><td>' + product_data.title + ' x ' + this.quantity + '</td></tr>';
                    str += "</table>";
                }
            });
            str += "</table>";
            $('#product_list_' + bag_id).html(str);

        }
        else {
            $('#more_' + bag_id).html('Bag details');
            $('#product_list_' + bag_id).html('');
        }
    }


    var PAM_format_money = function (cost) {
        var pnce = new String(cost % 100);
        var pnd = (cost - pnce) / 100;
        if (parseInt(pnce, 10) < 10)
            pnce = '0' + pnce;
        return "£" + pnd + "." + pnce;
    }

    var PAM_calculate_cost_for_bag = function (bag_id) {
        var cost = 0;
        var obj = PAM_get_bag_object();
        $(obj.bags).each(function () {
            var bagar = this;
            $(this.bag_ar).each(function () {
                if (this.id == bag_id) {
                    $(bagar.products).each(function () {
                        var product_data = PAM_product_data_from_id(this.product_id);
                        if (product_data)
                            cost += product_data.price * this.quantity;
                    });
                }
            });
        });
        return PAM_format_money(cost);
    }

    this.add_empty_bag = function () {
        self.is_busy = true;
        self.giftwrap_display = "";
        self.tag_display = "";
        self.message_display = "";
        self.gift_wrap_id = -1;
        self.tag_id = 'tag_none';

        PAM_close_open_bag();
        var d = new Date();
        var t = d.getTime();
        var pam_str = PAM_get_bag_str();
        var obj;
        if (pam_str.length == 0) {
            obj = { "selected": t, "bags": [], 'logging': "" };
        }
        else
            obj = JSON.parse(pam_str);
        var new_message = "";
        var encoded = encodeURIComponent('&');
        var new_name = 1;
        if (obj.bags.length > 0) {
            $(obj.bags).each(function () {
                $(this.bag_ar).each(function () {
                    console.log(this.name.split('BAG%20'))
                    if (parseInt(this.name.split('BAG%20')[1], 10) > new_name)
                        new_name = parseInt((this.name.split('BAG%20')[1]), 10);
                })
            });
            new_name++;
        }

        new_name = "BAG " + new_name;


        $('#new_bag_name').val('');
        $('#new_bag_message').val('');
        obj.bags.push({ "bag_ar": [{ "id": t, "name": new_name, "message": new_message, "encoded": encoded }], "products": [] });
        obj.selected = t;
        obj = JSON.parse(JSON.stringify(obj));


        PAM_set_bag_str(obj);
        PAM_ajax_create_new_bag();
        hide_all_popups();
    }


    var PAM_close_open_bag = function () {
        if (PAM_get_bag_str().length == 0)
            return;
        var obj = PAM_get_bag_object();

        if (obj.selected == -1)
            return;
        obj.selected = -1;
        PAM_set_bag_str(obj);
    }

    // add products to the selected bag
    this.add_product_quantity_to_bag = function (product_variant, quantity_elem) {
        if (self.is_busy)
            return;
        var obj = PAM_get_bag_object();
        var bag_obj = PAM_get_selected_bag(obj);
        var bag_products = PAM_get_products_for_bag(obj, obj.selected);
        var selected_product_quantity = parseInt($('#' + quantity_elem).val(), 10);

        //keep the existing PAM_STR, incase something goes wrong
        var keepsafe_str = PAM_get_bag_str();

        var is_empty = (bag_products.length == 0);
        var found = false;
        $(bag_products).each(function () {
            if (this.product_id == product_variant) {
                this.quantity = parseInt(this.quantity, 10) + selected_product_quantity;
                found = true;
            }
        });
        if (!found)
            bag_products.push({ "product_id": product_variant, "quantity": selected_product_quantity });
        PAM_set_bag_str(obj);
        //pass product & quantity to ajax_edit_bag. we update both cart products and PAM_STR attrib
        self.highlight_button(product_variant);
        PAM_ajax_edit_bag(product_variant, selected_product_quantity, PAM_get_bag_str(), keepsafe_str);
    }

    this.highlight_button = function (id) {
        $('#add_to_bag_' + id).addClass('add-to-bag-highlight');
        window.setTimeout(function () { $('#add_to_bag_' + id).removeClass('add-to-bag-highlight'); }, 300);
    }

    //called from ajax_remove_bag and close_bag
    var PAM_remove_bag = function (bag_id) {
        var obj = PAM_get_bag_object();
        var found_index = -1;
        $(obj.bags).each(function () {
            var bagar = this.bag_ar;
            $(this.bag_ar).each(function () {
                var count = 0;
                if (this.id == bag_id)
                    bagar.splice(count, 1);
                count++;
            });
        });

        $count = 0;
        $found_empty = -1;
        //remove any empty arrays
        $(obj.bags).each(function () {
            if (this.bag_ar.length == 0)
                $found_empty = $count;
            $count++;
        });
        if ($found_empty >= 0)
            obj.bags.splice($found_empty, 1);
        return obj;
    }


    /*called from ajax_remove_from_bag (click in the PAM_grid in the bag display.)
     * you can't change quantity - if you remove this product then you remove all of them
     */
    var PAM_remove_product_from_bag = function (product_id) {
        var obj = PAM_get_bag_object();
        var bag_obj = PAM_get_selected_bag(obj);
        var count = 0;
        var found = -1;
        var products = PAM_get_products_for_bag(obj, obj.selected);
        $(products).each(function () {
            if (this.product_id == product_id)
                found = count;
            count++;
        });
        if (found >= 0)
            products.splice(found, 1);
        PAM_set_bag_str(obj);
    }

    /* called by adjust cart quantities
     * how many of this product_id are in bags
     */
    var PAM_get_bagged_product_count = function (product_id) {
        var obj = PAM_get_bag_object();
        var count = 0;
        $(obj.bags).each(function () {
            var bags = this;
            $(this.products).each(function () {
                if (this.product_id == product_id) {
                    count += (parseInt(this.quantity, 10) * bags.bag_ar.length);
                }
            });
        });
        return count;
    }

    var PAM_adjust_cart_quantities = function () {
        $(self.cart.items).each(function () {
            var bagged_count = PAM_get_bagged_product_count(this.variant_id);
            var display_count = $('#updates_' + this.variant_id).val();
            if (bagged_count > 0) {
                if (bagged_count == this.quantity) {
                    $('#cart_item_' + this.variant_id).css('display', 'none');
                    $('#BDI_cart_item_' + this.variant_id).css('display', 'none');
                }
                else {
                    $('#updates_' + this.variant_id).val(this.quantity - bagged_count);
                    $('#BDIfixed_cart_quantity_' + this.variant_id).html(this.quantity - bagged_count);
                    var output = parseInt((this.quantity - bagged_count) * this.price, 10);
                    var os = new String(output);
                    var output1 = os.slice(0, os.length - 2);
                    var output2 = os.slice(os.length - 2);
                    var output = '£' + output1 + '.' + output2;
                    $('#BDI_line_total_' + this.variant_id).html(output);
                }
            }
            //hide gift wrap products
        });
        $('#cart-form').css('visibility', 'visible');
    }



    var PAM_create_pam_final = function (close_selected) {
        var pstr = PAM_get_bag_str();
        if (pstr.length > 3)
            $('#attributes_version_cart').val('1.00 ' + pstr.length + ' ' + pstr.substr(0, 3) + ' ' + pstr.substr(pstr.length - 3, 3));
        else
            $('#attributes_version_cart').val('1.00 ' + pstr.length);
        var obj = PAM_get_bag_object();
        if (obj == null && self.combine_packaging.length === 0) {
            $('#attributes_PICK-AND-MIX-INFO').html('none');
            return "";
        }
        var str = "";
        if (obj !== null) {
            if (close_selected)
                PAM_close_open_bag();
            obj = PAM_get_bag_object();
            $(obj.bags).each(function () {
                if (this.products.length) {
                    var bag_id = -1;
                    var message = "";
                    $(this.bag_ar).each(function () {
                        str += "\r\n.........\r\n";
                        str += decodeURIComponent(this.name) + " ";
                        bag_id = this.id;
                        message = this.message;
                    });
                    if (bag_id != -1) {
                        str += "\r\n.........,\r\n";
                        var gift_wrap_id = self.get_giftwrap_id(bag_id);
                        var tag_id = self.get_tag_id(obj, bag_id);
                        if (gift_wrap_id != -1) {
                            var product_data = PAM_product_data_from_id(gift_wrap_id);
                            if (product_data)
                                str += "Gift Wrap: \t " + product_data.title + "\xa0" + "," + "\xa0" + "\r\n";
                        }
                        if (tag_id == 'gift_tag_free')
                            str += "Gift Tag \t " + $('#gift_tag_free_title').val() + "\xa0" + "," + "\xa0" + "\r\n";
                        else if (tag_id != 'tag_none') {
                            var tag_data = PAM_product_data_from_id(tag_id);
                            str += "Gift Tag \t " + tag_data.title + "\xa0" + "," + "\xa0" + "\r\n";
                        }
                        var m = decodeURIComponent(message);
                        m = m.replace(/<br\/>/g, '\r\n');
                        m = m.replace(/<BR\/>/g, '\r\n');
                        m = m.replace(/<br \/>/g, '\r\n');
                        m = m.replace(/<BR \/>/g, '\r\n');
                        if (m.length)
                            str += "Message: " + m + "\xa0" + "," + "\xa0" + "\r\n\r\n";

                        $(this.products).each(function () {
                            if ((this.product_id != gift_wrap_id) && (this.product_id != tag_id)) {
                                var product_data = PAM_product_data_from_id(this.product_id);
                                if (product_data)
                                    str += product_data.title + "\t" + this.quantity + "\xa0" + "," + "\xa0" + "\r\n";
                            }
                        });
                    }
                }
            });
        }

        if (self.combine_packaging.length > 0)
            str += "\r\nCOMBINE PACKAGING " + self.combine_packaging;

        return str;
    }

    this.beforeCheckout = function (combinePacking, showTempt) {
        self.combine_packaging = combinePacking;



        if (showTempt)
            BDI_CART.show_checkout_tempt_popup()
        else
            BDI_CART.doPamSubmitFromCart()

    }


    this.delete_bag = function (bag_id) {
        dm('delete_bag ' + bag_id);
        if (window.confirm('Delete this entire bag? Are you sure?'))
            PAM_ajax_remove_bag_from_cart(bag_id);
    }


    /**************** AJAX ****************/


    var PAM_ajax_create_new_bag = function () {
        self.is_busy = true;
        var new_str = 'attributes[PAM_STR]=' + PAM_get_bag_str();
        var params = {
            type: 'POST',
            url: '/cart/update.js',
            data: new_str,
            dataType: 'json',
            success: function (cart) {
                self.cart = cart;
                PAM_set_bag_str(jQuery.parseJSON(cart.attributes['PAM_STR']));
                CartBadge.update_cart_quantity_badge();
                self.show_pick_and_mix_page();
                PAM_do_bag_display();
                self.is_busy = false;
                self.check_pam_quantities(cart);
            },
            error: function (err) {
                self.onAjaxError(err, 1);
            }
        };
        self.PAM_log(1);
        jQuery.ajax(params);
    };

    var PAM_ajax_update_cart_attrib = function (attrib_str, callback) {
        self.is_busy = true;
        window.setTimeout(function () {
            var params = {
                type: 'POST',
                url: '/cart/update.js',
                data: 'attributes[PAM_STR]=' + attrib_str,
                dataType: 'json',
                success: function (cart) {
                    self.check_pam_quantities(cart);
                    self.cart = cart;
                    if ((cart.attributes['PAM_STR'] == undefined) || (cart.attributes['PAM_STR'].length == 0)) {
                        PAM_set_bag_str(null);
                    }
                    else {
                        PAM_set_bag_str(jQuery.parseJSON(cart.attributes['PAM_STR']));
                        CartBadge.update_cart_quantity_badge();
                    }
                    self.show_pick_and_mix_page();
                    PAM_do_bag_display();
                    self.is_busy = false;
                },
                error: function (err) {
                    self.onAjaxError(err, 2);
                }
            };
            self.PAM_log(2);
            jQuery.ajax(params);
        }, 300);
    };

    var PAM_onAjaxError = function (XMLHttpRequest, textStatus) {
        if (self.run_auto_test) {
            return;
        }
        var data = eval('(' + XMLHttpRequest.responseText + ')');
        if (!!data.message) {
            alert(data.message + '(' + data.status + '): ' + data.description);
        } else {
            alert('Error : ' + ajaxifyShopify.fullMessagesFromErrors(data).join('; ') + '.');
        }
    };



    //called from PAM.init only
    var PAM_ajax_get_cart = function () {
        CartBadge.show_ajax_busy();
        self.is_busy = true;
        var params = {
            type: 'POST',
            url: '/cart/update.js',
            data: 'attributes[VERSION_CART]=ajax get cart v12',
            dataType: 'json',
            success: function (cart) {
                self.cart = cart;
                self.check_pam_quantities(cart);
                CartBadge.update_cart_quantity_badge();
                if ((cart.attributes['PAM_STR'] == undefined) || (cart.attributes['PAM_STR'].length == 0)) {
                    $('#PAM-cart-pick-and-mix-title').css('display', 'none');
                    $('#PAM-cart-display').css('display', 'none');
                    self.is_busy = false;

                    /*we hide the cart display until we have intercepted. No PAM_STR = no intercept reqd, so show the cart display*/
                    if (self.liquid_template.indexOf('cart') != -1) {
                        $('#cart-form').css('visibility', 'visible');
                    }
                    else if (self.liquid_template.indexOf('pam-template') !== -1) {
                        self.add_empty_bag();
                    }
                }
                else {
                    var nl = cart.attributes['PAM_STR'];
 					if (jQuery.parseJSON(nl).logging)
                        self.logging = jQuery.parseJSON(jQuery.parseJSON(nl).logging);
                    else
                        self.logging = [];
                    PAM_set_bag_str(jQuery.parseJSON(nl));
                    var obj = PAM_get_bag_object();
                    if ((obj.bags.length === 0 || obj.selected === -1) && (self.liquid_template.indexOf('pam-template') !== -1))
                        self.add_empty_bag();
                    if (self.liquid_template.indexOf('cart') == -1) {
                        self.show_pick_and_mix_page();
                        PAM_do_bag_display();
                    }
                    else {
                        PAM_do_cart_display();
                    }
                }
                self.is_busy = false;
            },
            error: function (err) {
                self.onAjaxError(err, 3);
            }
        };
        self.PAM_log(3)
        jQuery.ajax(params);
    }



    /* ADDING A PRODUCT FROM THE PAM GRID
    WE USE ADD.JS HERE - SO GET AN ERROR MESSAGE IF THERE IS AN OUT OF STOCK PROBLEM*/
    var PAM_ajax_edit_bag = function (product_id, quantity, attrib_str, existing_str) {
        CartBadge.show_ajax_busy();
        self.is_busy = true;
        dm('PAM ajax_edit_bag ' + attrib_str);
        var params = {
            type: 'POST',
            url: '/cart/add.js',
            data: "quantity=" + quantity + "&id=" + product_id,
            dataType: 'json',
            success: function (line_item) {
                PAM_ajax_update_cart_attrib(self.PAM_STR);
            },
            error: function (err) {
                self.onAjaxError(err, 5);
                PAM_ajax_update_cart_attrib(existing_str);
            }
        };
        self.PAM_log(5);
        jQuery.ajax(params);
    }

    /*called from PAM_grid*/
    this.ajax_remove_from_bag = function (product_id, quantity) {
        if (self.is_busy)
            return;
        CartBadge.show_ajax_busy();
        self.is_busy = true;
        dm('PAM ajax_remove_from_bag ');
        PAM_remove_product_from_bag(product_id);

        var old_quantity = 0;
        $(self.cart.items).each(function () {
            if (this.variant_id == product_id)
                old_quantity = this.quantity;
        });

        var new_quantity = parseInt(old_quantity, 10) - parseInt(quantity, 10);

        var params = {
            type: 'POST',
            url: '/cart/change.js',
            data: "quantity=" + new_quantity + "&id=" + product_id,
            dataType: 'json',
            success: function (cart) {
                PAM_ajax_update_cart_attrib(self.PAM_STR);
            },
            error: function (err) {
                self.onAjaxError(err, 6);
            }
        };
        self.PAM_log(6)
        jQuery.ajax(params);
    }

    var PAM_ajax_remove_bag_from_cart = function (bag_id) {
        if (self.is_busy)
            return;
        self.is_busy = true;
        var prod_ar = PAM_get_products_for_bag(null, bag_id);
        var updates_str = '';
        //for each product in the bag, subtract the quantity from the cart line item
        $(prod_ar).each(function () {
            var search_id = this.product_id;
            var search_quantity = parseInt(this.quantity, 10);
            $(self.cart.items).each(function () {
                if (this.variant_id == search_id) {
                    if (updates_str.length > 0)
                        updates_str += '&';
                    updates_str += "updates[" + search_id + "]=" + parseInt(this.quantity - search_quantity, 10);
                }
            });
        });

        //remove the bag & create a new PAM_STR from bag_object plus updates_str
        var obj = PAM_get_bag_object();
        var new_obj = PAM_remove_bag(bag_id);
        if (bag_id == new_obj.selected)
            new_obj.selected = -1;
        PAM_set_bag_str(new_obj);
        if (updates_str.length > 0)
            updates_str += '&';
        updates_str += 'attributes[PAM_STR]=' + PAM_get_bag_str();

        var params = {
            type: 'POST',
            url: '/cart/update.js',
            data: updates_str,
            dataType: 'json',
            success: function (cart) {
                self.is_busy = false;
                self.check_pam_quantities(cart);
                location.reload();
            },
            error: function (err) {
                self.onAjaxError(err, 4);
            }
        };
        self.PAM_log(4);
        jQuery.ajax(params);

    }


    this.auto_test = function () {
        var index = Math.floor(Math.random() * self.cart.items.length) - 1;
        if (index == -1)
            index = 0;
        var product_variant = self.cart.items[index].id;

        if (self.is_busy)
            return;
        //keep the existing PAM_STR, incase something goes wrong
        var keepsafe_str = PAM_get_bag_str();
        var obj = PAM_get_bag_object();
        var bag_products = PAM_get_products_for_bag(obj, obj.selected);

        var selected_product_quantity = Math.floor(Math.random() * 10) + 1;
        var found = false;
        $(bag_products).each(function () {
            if (this.product_id == product_variant) {
                this.quantity = parseInt(this.quantity, 10) + parseInt(selected_product_quantity, 10);
                found = true;
            }
        });
        if (!found)
            bag_products.push({ "product_id": product_variant, "quantity": selected_product_quantity });
        PAM_set_bag_str(obj);
        var params = {
            type: 'POST',
            url: '/cart/add.js',
            data: "quantity=" + selected_product_quantity + "&id=" + product_variant,
            dataType: 'json',
            success: function (line_item) {
                PAM_ajax_update_cart_attrib(self.PAM_STR);
            },
            error: function (err) {
                self.onAjaxError(err, 1000);
                PAM_ajax_update_cart_attrib(keepsafe_str);
            }
        };
        jQuery.ajax(params);
    }


    /*REQUIRED???*/
    this.init_giftwrap = function () {
        $addToCart = $('#addToCart');
        $addToCartText = $('#addToCartText');
        $('#giftwrap-sizes-select').prop('selectedIndex', 0);

        $('#giftwrap-sizes-select').change(function () {
            var quantity = 1000;
            $('#productSelect').val($('#size-and').val());
            $('.giftwrap-options-panel').css('display', 'none');
            if ($('#giftwrap-sizes-select').val() != '-1') {
                $('#giftwrap-select-' + $('#giftwrap-sizes-select').val()).prop('selectedIndex', 0);
                $('#giftwrap-options-panel-' + $('#giftwrap-sizes-select').val()).css('display', 'block');
                quantity = $('#stock-level-' + $('#giftwrap-sizes-select').val()).val();
            }

            if (quantity == 0) {
                $addToCart.addClass('disabled').prop('disabled', true);
                $addToCartText.html("Sold Out");
            }
            else {
                $addToCart.removeClass('disabled').prop('disabled', false);
                $addToCartText.html("Add to Basket");
            }
        });

        $('.giftwrap-select').change(function () {
            $('#productSelect').val($(this).val());
        });
    }

    this.show_product_details = function (prod_handle) {
        window.location = '/products/' + prod_handle;
    }

    this.hide_product_details = function (prod_handle) {
        $('#PAM-product-grid').css('display', 'block');
        $('#PAM-product-details').css('display', 'none');
    }

    this.show_message_input = function () {
        if ($('#show_message_checkbox').prop('checked'))
            $('#pam-gift-message-input').css('display', 'table');
        else
            $('#pam-gift-message-input').css('display', 'none');
    }


    this.start_auto_test = function () {

        self.run_auto_test = true;
        self.auto_test();
    }


    /*not a PAM action - actually a GW item. called from cart page only (so in this class cos it is guaranteed to have the cart obj from server*/
    this.remove_product_with_giftwrap = function (index, gift_wrap_id, tag_id) {
        index -= 1;
        self.gift_wrapped_line_item_to_remove = index;
        var cart_quantity = self.cart.items[index].quantity;
        var gquantity = 0;
        var tquantity = 0;
        $(self.cart.items).each(function () {
            if (this.variant_id == gift_wrap_id)
                gquantity = this.quantity - cart_quantity;
            if (this.variant_id == tag_id)
                tquantity = this.quantity - cart_quantity;
        });
        var data_str = "updates[" + self.cart.items[index].variant_id + "]=0";
        if (gift_wrap_id != -1)
            data_str += "&updates[" + gift_wrap_id + "]=" + gquantity;
        if ((tag_id != 'tag_none') && (tag_id != 'gift_tag_free'))
            data_str += "&updates[" + tag_id + "]=" + tquantity;
        var params = {
            type: 'POST',
            url: '/cart/update.js',
            data: data_str,
            dataType: 'json',
            success: function (cart) {
                window.location.reload(true);
            },
            error: function (err) {
                PAM_onAjaxError(err, 100);
            }
        };
        self.PAM_log(100);
        jQuery.ajax(params);
    }

    this.adjust_line_item_quantity = function (line_index) {
        var quantity = $('#quantity_line_' + line_index).val();
        var data_str = "line=" + line_index + "&quantity=" + quantity;
        var params = {
            type: 'POST',
            url: '/cart/change.js',
            data: data_str,
            dataType: 'json',
            success: function (cart) {
                self.check_pam_quantities(cart);
                if (parseInt(quantity, 10) && cart.items[line_index - 1].quantity != quantity) {
                    show_message("There is limited availability of this item. All available items have been added to your basket", function () { window.location.reload(true); });
                }
                else
                    window.location.reload(true);
            },
            error: function (err) {
                PAM_onAjaxError(err, 9);
            }
        };
        self.PAM_log(9);
        jQuery.ajax(params);

    }

    this.filter_brand = function () {
        var sel = ($('#pam_brand_filter').find(':selected').val());
        if (sel == 'ALL')
            window.location.href = '/collections/pick-and-mix?view=pam-template-paginate';
        else {
            sel = sel.replace('pick-and-mix-brand-', '');
            window.location.href = '/collections/pick-and-mix?view=pam-template-' + sel + '-paginate';
        }
    }

    this.filter_brand_button = function (sel) {
        if (sel == 'ALL')
            window.location.href = '/collections/pick-and-mix?view=pam-template-paginate';
        else {
            sel = sel.replace('pick-and-mix-brand-', '');
            window.location.href = '/collections/pick-and-mix?view=pam-template-' + sel + '-paginate';
        }
    }



    /* V6 - is there an open PAM bag? if so, how many products does it contain? */
    this.can_checkout = function () {
        if (PAM_get_bag_str().length > 0) {
            var obj = PAM_get_bag_object();
            if (obj.selected > -1) {
                var selected_bag_obj = PAM_get_selected_bag(obj);
                var bag_products = PAM_get_products_for_bag(obj, obj.selected);
                var gift_wrap_id = this.get_giftwrap_id(obj.selected);
                var tag_id = this.get_tag_id(obj, obj.selected);

                var quantity = 0;
                $(bag_products).each(function () {
                    if ((this.id != gift_wrap_id) && (this.id != tag_id))
                        quantity += this.quantity;
                });
                if (this.min_pam_per_bag > 0) //0 means disable - no minimum
                {
                    if ((quantity > 0) && (quantity < this.min_pam_per_bag)) {
                        return { can_checkout: false, quantity: quantity, min: this.min_pam_per_bag };
                    }
                }
            }
        }
        return { can_checkout: true };
    }

    this.check_pam_quantities = function (cart) {

        if (!cart.attributes['PAM_STR'])
            return;
        var gift_wrap_ids = $('#gift_wrap_ids').val();
        var obj = JSON.parse(cart.attributes['PAM_STR']);
        var errProds = [];
        var cartProds = [];
        var bagProds = [];

        $(cart.items).each(function () {
            found = false;
            var prod = this;
            $(cartProds).each(function () {
                if (this.product_id === prod.variant_id) {
                    this.quantity += prod.quantity;
                    found = true;
                }
            });
            if (!found)
                cartProds.push({ product_id: prod.variant_id, quantity: prod.quantity });
        });

        $(obj.bags).each(function () {
            var bag = this;
            $(bag.products).each(function () {
                found = false;
                var prod = this;
                $(bagProds).each(function () {
                    if (parseInt(prod.product_id, 10) === this.product_id) {
                        this.quantity += prod.quantity;
                        found = true;
                    }
                });
                if (!found)
                    bagProds.push({ product_id: parseInt(prod.product_id, 10), quantity: prod.quantity });
            });
        });

        /*
        $(cartProds).each(function () {
            var found = false;
            var prod = this;
            $(bagProds).each(function () {
                if (this.product_id === prod.product_id) {
                    if (this.quantity === prod.quantity)
                        found = true;
                }
            })
            if (!found)
                errProds.push(this);
        })
        */

        $(bagProds).each(function () {
            if (gift_wrap_ids.indexOf(this.product_id) == -1) {
                var found = false;
                var prod = this;
                $(cartProds).each(function () {
                    if (this.product_id === prod.product_id) {
                        if (this.quantity === prod.quantity)
                            found = true;
                    }
                })
                if (!found) {
                    this.quantity = 0;
                    errProds.push(this);
                }
            }
        })

        if (errProds.length === 0)
            return;

        if (self.developer_mode) {
            alert("PICK AND MIX QUANTITY MISMATCH");
            $(errProds).each(function () {
                console.log(JSON.stringify(this));
            })
        }
        self.correctQuantityErrors(cart, errProds);
        self.PAM_log("MISMATCH")
        self.doLogging = false;
    }

    this.correctQuantityErrors = function (cart, errProds) {
        return;
        var obj = JSON.parse(cart.attributes['PAM_STR']);
        var selBag;

        errProds[0].bagQuantity = 12;

        $(obj.bags).each(function () {
            var bags = this;
            $(bags.bag_ar).each(function () {
                if (this.id === obj.selected) {
                    selBag = bags;
                }
            })
        });
        if (!selBag)
            return;
        for (var i = errProds.length - 1; i >= 0; i--) {
            var found = false;
            $(selBag.products).each(function () {
                var correction = errProds[i].bagQuantity - errProds[i].quantity;
                if (parseInt(this.product_id, 10) === errProds[i].product_id) {
                    if (correction < 0) {
                        found = true;
                        this.quantity -= correction;
                    }
                    else {
                        if (this.quantity >= correction) {
                            this.quantity -= correction;
                            found = true;
                        }
                        else
                            errProds[i].bagQuantity -= this.quantity;
                        this.quantity = 0;
                    }
                }
            });
            if (found)
                errProds.splice(i, 1);
        }
        console.log("edited " + JSON.stringify(obj))
        console.log(JSON.stringify(errProds));
    }

    this.onAjaxError = function (err, logId) {
        if (self.developer_mode)
            alert(err.message + ", " + logId);
        self.PAM_log(err + ", id: " + logId);
        self.check_pam_quantities(self.cart);
        self.is_busy = false;
    };

}
