#A JavaScript HTML Validator (Insert catchy name here)

This project is a Javascript HTML validator. 
Are you fed up of using slow, server side validators with obscure error messages?
Maybe you aren't, but as a Chrome developer there is no decent HTML validation solution.
The aim of this project this:

- To allow anyone on any browser be able to validate HTML, either using a bookmarklet or browser extension
- To support the major doctypes: HTML 4.01, XHTML 1.0 and eventually HTML 5
- To provide a plain English, sensible version of the W3C HTML spec

I'd also like to use the platform to create an experimental doctype for best practice HTML, which would be user specified.

#HTML Doctype Bugs

- object in head can contain content
- object in head can contain head elements
- Textarea can contain del/ins
- Noscript can contain script
- li types are only specified in comment (transitional)
- id does not allow multiple ids (give example)
- class attribute does not have any kind of constraint
- html special chars do not require escaping, except quotes in attributes

#HTML W3C Validator Bugs

- Fails when table has no tbody or tbody children