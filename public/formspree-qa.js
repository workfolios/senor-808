(() => {
  'use strict';

  // Temporary controlled-QA routing. Remove this file and its index.html script
  // reference after the Formspree delivery test is complete.
  const FORMSPREE_QA_ENDPOINT = 'https://formspree.io/f/mjgnlava';
  const FORM_SELECTOR = 'form.smart-inquiry';

  const synchronizeForm = () => {
    const form = document.querySelector(FORM_SELECTOR);
    if (!form) return;

    if (form.getAttribute('action') !== FORMSPREE_QA_ENDPOINT) {
      form.setAttribute('action', FORMSPREE_QA_ENDPOINT);
    }

    const subjectField = form.querySelector('input[name="_subject"]');
    if (subjectField) subjectField.setAttribute('name', 'subject');

    const honeypotField = form.querySelector('input[name="_honey"]');
    if (honeypotField) honeypotField.setAttribute('name', '_gotcha');

    ['_next', '_template', '_replyto'].forEach((fieldName) => {
      form.querySelector(`input[name="${fieldName}"]`)?.remove();
    });

    const inquiryIntro = document.querySelector('#start-project .inquiry-intro > .lead');
    const inquiryIntroCopy = 'Choose the type of inquiry, share the essential details, and review everything before sending it to the designated Señor 808 project inquiry inbox.';
    if (inquiryIntro && inquiryIntro.textContent !== inquiryIntroCopy) {
      inquiryIntro.textContent = inquiryIntroCopy;
    }

    const reviewHeading = Array.from(form.querySelectorAll('.inquiry-step-heading h3')).find(
      (heading) => heading.textContent?.trim() === 'Review before sending.'
    );
    const reviewCopy = reviewHeading?.nextElementSibling;
    const reviewText = 'Confirm the information below. Selecting Send Project Inquiry will deliver the message to the designated Señor 808 project inquiry inbox.';
    if (reviewCopy && reviewCopy.textContent !== reviewText) {
      reviewCopy.textContent = reviewText;
    }

    const privacyNote = form.querySelector('.privacy-note');
    const privacyCopy = 'Form submissions are processed by Formspree and delivered by email. Do not include confidential, financial, medical, or payment information.';
    if (privacyNote && privacyNote.textContent !== privacyCopy) {
      privacyNote.textContent = privacyCopy;
    }
  };

  const startObserver = () => {
    synchronizeForm();

    const root = document.getElementById('root') || document.body;
    const observer = new MutationObserver(synchronizeForm);
    observer.observe(root, { childList: true, subtree: true });

    document.addEventListener(
      'submit',
      (event) => {
        if (event.target instanceof HTMLFormElement && event.target.matches(FORM_SELECTOR)) {
          synchronizeForm();
        }
      },
      true
    );
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }
})();
