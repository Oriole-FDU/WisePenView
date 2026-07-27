const enUSAuth = {
  common: {
    formAria: 'Authentication form',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    passwordRules: 'At least 9 characters, including both letters and numbers.',
  },
  login: {
    title: 'Sign In',
    accountLabel: 'Campus ID / Username',
    accountRequired: 'Please enter your campus ID or username',
    accountPlaceholder: 'Enter campus ID / username',
    passwordLabel: 'Password',
    passwordRequired: 'Please enter your password',
    passwordPlaceholder: 'Enter password',
    submit: 'Sign In',
    register: 'Register',
    forgotPassword: 'Forgot password',
    agreementPrefix: 'By signing in, you agree to',
    agreementLink: 'User Agreement',
    loginFailed: 'Login failed',
  },
  register: {
    title: 'Register',
    usernameLabel: 'Username',
    usernameRequired: 'Please enter username',
    usernamePattern: 'Username must be 4-20 letters, numbers, or underscores',
    usernamePlaceholder: '4-20 letters, numbers, or underscores',
    passwordLabel: 'Password',
    passwordRequired: 'Please enter password',
    passwordMinLength: 'Password must be at least 9 characters',
    passwordContainsLetter: 'Password must contain letters',
    passwordContainsNumber: 'Password must contain numbers',
    passwordPlaceholder: 'Enter password',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordRequired: 'Please enter password again',
    confirmPasswordMismatch: 'The two passwords do not match',
    confirmPasswordPlaceholder: 'Enter password again',
    agreementCheckedPrefix: 'I have read and accept',
    agreementLink: 'User Agreement',
    submit: 'Register',
    hasAccount: 'Already have an account?',
    toLogin: 'Sign In',
    registerSuccess: 'Registration successful.',
    registerFailed: 'Registration failed',
    agreementRequired: 'Please accept the user agreement',
  },
  resetPassword: {
    title: 'Reset Password',
    alertPrefix: 'Password reset: ',
    alertHighlight:
      'You need to sign in to your campus email to receive the reset link. The default mailbox is your campus ID mailbox.',
    alertSuffix:
      'If you cannot access your campus email unexpectedly, please contact the administrator.',
    campusNumLabel: 'Campus ID',
    campusNumRequired: 'Please enter your campus ID',
    campusNumPlaceholder: 'Enter campus ID',
    submit: 'Send verification code',
    backToLogin: 'Back to Sign In',
    sendSuccess: 'An email will be sent to your campus mailbox. Please check it.',
    sendFailed: 'Failed to send',
  },
  verifyEmail: {
    title: 'Email Verification',
    alertDescription: 'Please click the button below to verify your email.',
    submit: 'Verify Now',
    successTitle: 'Email Verified',
    successDescription: 'Verification succeeded. You can view it in account settings.',
    goToAccount: 'Go to Account Settings',
    invalidToken: 'Invalid or expired link',
    verifySuccess: 'Email verification succeeded',
    verifyFailed: 'Verification failed',
  },
  newPassword: {
    title: 'Set New Password',
    passwordLabel: 'New Password',
    passwordRequired: 'Please enter new password',
    passwordMinLength: 'Password must be at least 9 characters',
    passwordContainsLetter: 'Password must contain letters',
    passwordContainsNumber: 'Password must contain numbers',
    passwordPlaceholder: 'Enter new password',
    confirmPasswordLabel: 'Confirm New Password',
    confirmPasswordRequired: 'Please enter new password again',
    confirmPasswordMismatch: 'The two new passwords do not match',
    confirmPasswordPlaceholder: 'Enter new password again',
    submit: 'Confirm',
    backToLogin: 'Back to Sign In',
    successTitle: 'Password Set Successfully',
    successDescription: 'Password has been updated. Please go to the sign-in page.',
    stayHere: 'Stay on this page',
    goToLogin: 'Go to Sign In',
    tokenMissing: 'Token is missing',
    setFailed: 'Failed to set password',
  },
  agreement: {
    title: 'Service Agreement',
    close: 'I Understand',
    sections: [
      {
        title: 'I. General Provisions',
        clauses: [
          {
            text: 'To protect network information security, safeguard the lawful rights and interests of citizens, legal persons, and other organizations, and preserve national security and the public interest, the Platform has established this Agreement and provides online services in accordance with it, pursuant to applicable national laws and relevant provisions of the Standing Committee of the National People’s Congress.',
          },
          {
            text: 'This Service Agreement consists of the following terms. Users shall read and agree to all terms of this Agreement and complete the entire registration process as prompted on the page. By clicking or selecting “Agree,” “Accept,” or a similar button during registration, a user indicates full acceptance of all terms under this Agreement. A user who chooses to access or use services related to the Platform will be deemed to have agreed to be bound by all terms of this Agreement.',
          },
          {
            text: 'Unless otherwise expressly provided, all new products, features, and services launched by the Platform are unconditionally subject to this Agreement.',
          },
          {
            text: 'The Platform has the right to amend this Agreement in light of actual circumstances. The Platform will notify you of any updates on its official website seven days in advance through appropriate means, including but not limited to pop-up notices and website announcements, so that you can promptly learn about the latest version of this Agreement.',
          },
          {
            text: 'Before using any service provided by the Platform, users shall carefully read this Agreement. If you disagree with this Agreement or any amendment made by the Platform, you may cancel the services provided by the Platform. If you continue to use the Platform’s services, you will be deemed to have accepted the entire Agreement, including any amendment made by the Platform.',
          },
          {
            text: 'Users are bound by this Agreement regardless of the manner in which they use the Platform’s services.',
          },
        ],
      },
      {
        title: 'II. User Accounts',
        clauses: [
          {
            text: 'Users may access the services provided by the Platform by registering an account on this website. After successful registration, the Platform will issue the user an account and corresponding password. Once approved by the Platform, each account will correspond to a unique name, usually a campus or employee ID. Upon completing the registration application, the user obtains the right to use the Platform account solely for personal, non-commercial purposes.',
          },
          {
            text: 'Users are responsible for safeguarding their accounts and passwords. The right to use an account and password belongs only to the original registrant and may not be gifted, loaned, rented, transferred, or sold.',
          },
          {
            text: 'Users shall provide complete, truthful, accurate, and up-to-date personal information. This information is essential for using the Platform’s services and recovering a lost Platform account or password. Users are solely responsible for any issue arising from untruthful registration information.',
          },
          {
            text: 'If a user’s account or password is used unlawfully by another person, or if any other security issue occurs, the user shall immediately notify the Platform. The user bears the corresponding responsibility when the unlawful use of the account or password results from the user’s fault.',
          },
        ],
      },
      {
        title: 'III. Service Provision and Privacy Protection',
        clauses: [
          {
            text: 'When accessing or using the Platform, or applying to use its services, you must provide your own truthful personal information and promptly update it whenever your circumstances change.',
          },
          {
            text: 'The Platform is not responsible for verifying the truthfulness, accuracy, or completeness of the personal information you provide. You are solely responsible for any issue and consequence arising from information that is untruthful, inaccurate, or incomplete, and you shall hold the Platform harmless from any resulting damage or liability. If we discover that the personal information you provided is false, inaccurate, or incomplete, we may terminate the services provided to you at our sole discretion.',
          },
          {
            text: 'You expressly authorize us, for purposes including providing services, performing this Agreement, resolving disputes, and safeguarding transaction security, to retain, organize, process, use, and disclose as necessary for the services: service-related personal information provided by you, collected by us, or collected through third parties; information related to your service application; non-public content stored on the Platform while you use the services; and your other personal information (collectively, “Personal Information”). Such activities include but are not limited to:',
            items: [
              'Publishing your Personal Information on this website when necessary to provide services to you.',
              'Collecting, evaluating, organizing, and storing your Personal Information through manual or automated processes.',
              'Using your Personal Information to improve the design and promotion of this website.',
              'Using the contact information you provide to contact you and deliver service- and administration-related information.',
              'Analyzing and integrating your Personal Information and providing third parties that serve you with the Personal Information and other information necessary to complete those services.',
              'If you breach an agreement with us or another user, disclosing your Personal Information and the facts of the breach, recording the breach on a blacklist, and sharing data with necessary third parties for review and recovery by us and those third parties.',
              'Other circumstances in which it is necessary to use or disclose your Personal Information. We are not liable for losses you incur as a result of our exercise of the rights under this clause.',
            ],
          },
          {
            text: 'The Platform follows industry practices to protect your information and will use its best efforts, within the limits of currently available technology, to protect your personal information.',
          },
          {
            text: 'The Platform will not maliciously sell or provide your Personal Information free of charge to unrelated third parties, except in the following circumstances:',
            items: [
              'You have given prior express authorization.',
              'Disclosure is required by a relevant judicial body or competent government authority.',
              'Disclosure is necessary to protect the lawful rights and interests of the Platform.',
              'Disclosure is necessary to protect the public interest.',
              'To comply with lawful government or legal requests, subpoenas, or directives; to protect the Platform’s systems and users; or to ensure the integrity and operation of the Platform’s business and systems, we may access and disclose any information we consider necessary or appropriate, including but not limited to users’ personal information, IP addresses and traffic information, usage history, and published content.',
              'Disclosure otherwise complies with lawful requirements.',
            ],
          },
        ],
      },
      {
        title: 'IV. Rules of Use',
        clauses: [
          {
            text: 'When using the Platform’s services, users must comply with applicable national laws and regulations and may not use the Platform to publish, copy, upload, disseminate, distribute, store, create, or otherwise make public any information containing:',
            items: [
              'Content that opposes the fundamental principles established by the Constitution.',
              'Content that endangers national security, discloses state secrets, subverts state power, or undermines national unity.',
              'Content that damages national honor or interests.',
              'Content that incites ethnic hatred or discrimination or undermines ethnic unity.',
              'Content that undermines national religious policies or promotes cults or feudal superstition.',
              'Content that spreads rumors, disrupts social order, or undermines social stability.',
              'Obscene or pornographic content; content involving gambling, violence, murder, terror, or incitement to commit crimes; fraudulent content; or other objectionable messages, data, information, text, music, sounds, photographs, graphics, code, or materials.',
              'Content that insults or defames others or infringes their lawful rights and interests.',
              'Other content that violates the Constitution, laws, administrative regulations, or rules.',
              'Content that may infringe another person’s patent, trademark, trade secret, copyright, or other intellectual property or proprietary right.',
              'Content that impersonates any person or entity or otherwise misrepresents your affiliation with any person or entity.',
              'Unsolicited promotional information, political activities, advertising, or solicitation of opinions.',
              'Any third party’s private information, including but not limited to addresses, telephone numbers, email addresses, identity card numbers, and credit card numbers.',
              'Viruses, unreliable data, or other harmful, destructive, or hazardous files.',
              'Content unrelated to the topic of the interactive area in which it appears.',
              'Content that, in our sole judgment, is objectionable; restricts or prevents another person from using or enjoying an interactive area or the Platform; or may expose us, our affiliates, or other users to any type of harm or liability.',
              'Any other content prohibited by law or administrative regulation.',
            ],
          },
          {
            text: 'Users may not use the Platform’s services to engage in any of the following activities that endanger computer information network security:',
            items: [
              'Accessing a computer information network or using computer information network resources without authorization.',
              'Deleting, modifying, or adding functions of a computer information network without authorization.',
              'Deleting, modifying, or adding data or applications stored, processed, or transmitted within a computer information network without authorization.',
              'Intentionally creating or spreading destructive programs such as computer viruses.',
              'Any other conduct that endangers computer information network security.',
            ],
          },
          {
            text: 'We reserve the right, at any time and for any reason, to filter, remove, screen, or edit any content published or stored on this website without notice. You are solely responsible, at your own cost and expense, for backing up and replacing any content you publish or store on this website.',
          },
          {
            text: 'Users bear legal responsibility for their conduct while using the Platform’s services.',
          },
          {
            text: 'If your actions affect the overall stability or integrity of the system, we will suspend or terminate those actions until the relevant issue is resolved.',
          },
          {
            text: 'To use the Platform’s services, users must provide at their own expense the equipment required to access the Internet, including computers, mobile phones, and other devices used to connect to the Internet or mobile networks, and must pay all costs associated with such services.',
          },
        ],
      },
      {
        title: 'V. Intellectual Property and Other Rights',
        clauses: [
          {
            text: 'All information or materials contained in the Platform’s services, including text, charts, audio, video, and/or software (including but not limited to charts, animations, audio, video, interface designs, data and programs, code, and documentation contained in the software), are protected by copyright law, trademark law, and/or other applicable laws. Without the written consent of the relevant rights holder, users may not use such information or materials in any manner except as necessary to use the Platform’s services.',
          },
          {
            text: 'This Agreement does not grant users any right to use the Platform’s trademarks, service marks, logos, domain names, or other distinctive brand features.',
          },
          {
            text: 'Except as expressly permitted by this Agreement, users may not modify, rent, lease, lend, sell, distribute, copy, create derivative works from, or use for any commercial purpose any part or all of the Platform’s services in any form or manner.',
          },
          {
            text: 'Information published by users on the Platform may not infringe any third party’s intellectual property rights. Without the prior written consent of the relevant rights holder, users may not upload, publish, modify, transmit, or copy in any manner any copyrighted material, trademark, or proprietary information belonging to another person.',
          },
          {
            text: 'Content, images, and other materials that you publicly publish or disseminate on the Platform are non-confidential information, and we have no obligation to treat them as your confidential information. Without limiting the foregoing, we reserve the right to use content in an appropriate manner, including but not limited to deleting, editing, altering, declining to adopt, or refusing to publish it. We are not obligated to pay you for content you submit. Once content has been published on the Platform, we also do not guarantee that you will have an opportunity to edit, delete, or otherwise modify it.',
          },
          {
            text: 'If a rights holder discovers that content you published on the Platform infringes the holder’s rights and sends us written notice in accordance with applicable laws and administrative regulations, the Platform may remove the relevant content without prior notice to you and retain the relevant data in accordance with law. You agree not to seek compensation from us for such removal. If we incur any loss as a result, you shall indemnify us for that loss, including but not limited to costs and attorneys’ fees.',
          },
          {
            text: 'If you believe that the content referred to in Clause 6 that you published does not infringe another party’s rights, you may send us a written notice stating that the removed content does not infringe those rights. The notice shall include: detailed proof of your identity, residential address, and contact information; evidence supporting your belief that the removed content does not infringe another party’s rights; the location of the removed content on the Platform; and a declaration that the contents of the written notice are truthful. After receiving the written notice, we may decide whether to restore the removed content.',
          },
          {
            text: 'You hereby agree that if any statement in the written notice described in Clause 7 is false, you will bear all resulting legal liability. If we incur any loss as a result, you shall indemnify us for that loss, including but not limited to costs and attorneys’ fees.',
          },
          {
            text: 'If you believe that your intellectual property rights or other lawful rights and interests have been infringed, please provide the Platform with the following materials:',
            items: [
              'Proof that you own the intellectual property right or other lawful right or interest in the allegedly infringing content.',
              'The rights holder’s specific qualification and contact information, including the individual’s name, a copy of an identity card or passport, a copy of the entity’s business license or other qualification certificate, mailing address, and telephone number.',
              'The location of the allegedly infringing content on this website.',
              'A detailed description of the alleged infringement.',
              'The following declaration regarding the truthfulness of the notice: “All consequences arising from the foregoing actions are unrelated to the Platform and shall be borne by me/my company.”',
            ],
          },
          {
            text: 'After receiving a notice from a rights holder, the Platform may, based on its reasonable judgment, remove content that infringes another person’s intellectual property rights or other lawful rights and interests.',
          },
        ],
      },
      {
        title: 'VI. Disclaimer',
        clauses: [
          {
            text: 'The Platform cannot guarantee the accuracy of content published by users, including but not limited to questions and answers.',
          },
          {
            text: 'Content published by users on the Platform reflects only their personal positions and opinions and does not represent the Platform’s position, opinion, or recommendation. Each publisher is solely responsible for the content they publish and bears all legal and joint liability for any dispute arising from that content. The Platform bears no legal or joint liability.',
          },
          {
            text: 'Use of the Platform’s services involves Internet services and may be affected by instability at various stages. Service interruptions or an inability to meet user requirements may result from force majeure, hacker attacks, system instability, network outages, user device shutdowns, communication lines, or other causes. The Platform assumes no liability for such events but will endeavor to minimize the resulting loss and impact on users.',
          },
          {
            text: 'We firmly oppose any conduct that violates copyright laws or regulations. Upon discovery, we may immediately remove and cease further dissemination of any pirated or unlawfully reproduced material or other infringing work.',
          },
          {
            text: 'Information provided by the Platform, including but not limited to links to third-party websites supplied for users’ convenience, is for reference only. The Platform does not guarantee its accuracy, validity, timeliness, completeness, or quality. Users shall exercise caution when using such information, and the Platform assumes no responsibility for risks caused by users themselves or by other third parties.',
          },
          {
            text: 'If a user causes loss to the Platform or any other third party by violating any applicable law, regulation, or term of this Service Agreement, the user shall be liable for the resulting damages.',
          },
        ],
      },
      {
        title: 'VII. Changes, Interruptions, or Termination of Services',
        clauses: [
          {
            text: 'You understand and agree that the Platform may change the content of its services and may interrupt, suspend, or terminate those services.',
          },
          {
            text: 'We may unilaterally interrupt or terminate all or part of the services provided to you without notice in any of the following circumstances:',
            items: [
              'The personal information you provide is untruthful.',
              'While using the Platform’s services, you violate laws or regulations, this Agreement, social ethics, public order or good morals, and/or the lawful rights and interests of another person.',
              'You engage in conduct that violates laws or regulations, social ethics, public order or good morals, and/or the lawful rights and interests of another person, and that conduct affects or may affect the reputation, standing, or other lawful rights and interests of the Platform and/or another person.',
              'You use the Platform for commercial purposes without our written consent.',
            ],
          },
          {
            text: 'You may notify us at any time to terminate the services provided to you or directly cancel the Platform’s services. From the date on which you terminate or cancel the services, we will no longer bear any form of liability to you.',
          },
        ],
      },
    ],
  },
};

export default enUSAuth;
