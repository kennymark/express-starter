import jwt from 'jsonwebtoken';
import passport from 'passport';
import config from '../config/config';
import messages from '../data/messages';
import userModel from '../models/user.model';
import emailController from './email.controller';

class UserController {

  showLogin(_, res) {
    res.render('account/login', { title: 'Login', })
  }

  showRegister(_, res) {
    res.render('account/register', { title: 'Register', })
  }

  async showProfile(req, res) {
    const user = await userModel.findById(req.user.id)
    return res.render('account/profile', { title: 'Profile', user })

  }

  showforgottenPassword(_, res) {
    res.render('account/forgot-password', { title: ' Forgotten password' })
  }

  showResetPassword(req, res) {
    res.render('account/reset-password', { title: 'Reset Password', params: req.params })
  }

  async showAdminProfile(req, res) {
    const page = req.query.page || 1
    const activeUsers = await userModel.find({ is_active: true })
    const deletedUsers = await userModel.find({ is_deleted: true })
    const result = await userModel.paginate({ is_deleted: false }, { page, limit: 10 })
    let pagesArr = []
    res.render('admin', {
      title: 'Admin Page',
      pages: pagesArr,
      data: result,
      deletedUsers,
      activeUsers
    })
  }



  async search(req, res) {
    const { search, query } = req.query
    const page = req.query.page || 1
    const result = await userModel.paginate({ [query]: new RegExp(`${search}`, 'i') }, { page, limit: 10 })
    console.log(result)
    return res.render('admin', { title: 'Admin Page', data: result })
  }


  async localLogin(req, res, next) {
    passport.authenticate('login', async (err, user, _info) => {
      try {
        if (err || !user) return res.render('account/login', { error: messages.user_not_found })
        req.login(user, _ => {
          if (user.is_admin) return res.redirect('/user/profile/admin/')
          if (user.is_deleted) {
            req.flash('error', messages.user_not_found)
            return res.redirect('/user/register')
          }
          return res.redirect('/user/profile/')
        })
      } catch (error) { return next(error) }
    })(req, res, next)
  }

  logUserOut(req, res) {
    req.logout()
    res.redirect('/')
  }

  twitterLogin(req, res, next) {
    this.socials()
    passport.authenticate('twitter', (err, user, _info) => {
      try {
        req.login(user, err => res.redirect('/user/profile/'))
      } catch (error) {
        req.flash('error', messages.login_failure)
        res.redirect('/user/login')
        return next(error)
      }
    })(req, res, next)
  }

  socials() {
    console.log('sociaalss', new Date())
  }

  facebookLogin(req, res, next) {
    passport.authenticate('facebook', (_err, user, _info) => {
      try {
        req.login(user, err => res.redirect('/user/profile/'))
      } catch (error) {
        req.flash('error', messages.login_failure)
        res.redirect('/user/login')
        return next(error)
      }
    })(req, res, next)
  }

  githubLogin(req, res, next) {
    passport.authenticate('github', (_err, user, _info) => {
      try {
        req.login(user, err => res.redirect('/user/profile/'))
      } catch (error) {
        req.flash('error', messages.login_failure)
        res.redirect('/user/login')
        return next(error)
      }
    })(req, res, next)
  }

  googleLogin(req, res, next) {
    passport.authenticate('google', (_err, user, _info) => {
      try {
        req.login(user, err => res.redirect('/user/profile/'))
      } catch (error) {
        req.flash('error', messages.login_failure)
        res.redirect('/user/login')
        return next(error)
      }
    })(req, res, next)
  }


  async deleteUser(req, res) {
    const { id } = req.params
    const deleteParams = { is_deleted: true, is_active: false };
    // if (!id) {
    //   await userModel.findOneAndUpdate(req.user.id, deleteParams)
    //   req.flash('message', messages.account_deleted)
    //   req.logout()
    //   res.redirect('/')
    // }
    const user = await userModel.findOneAndUpdate(id, deleteParams)
    req.flash('message', messages.account_deleted)
    console.log(user)
    res.redirect('/user/profile/admin')
  }



  async freezeUser(req, res) {
    const { id } = req.params
    await userModel.findOneAndUpdate(id, { is_active: false })
    req.flash('message', messages.account_frozen)
    req.logout()
    res.redirect('/')
  }

  async showEdituser(req, res) {
    const { id } = req.params
    try {
      const user = await userModel.findById(id)
      if (user) {
        res.render('account/edit-user', { data: user })
      }
    } catch (error) {
      req.flash('error', error)
      res.render('home')
    }
  }

  async updateUser(req, res) {
    const { user: id } = req.session.passport
    try {
      await userModel.findByIdAndUpdate(id, req.body)
      req.flash('message', messages.user_updated)
      res.redirect('/user/profile/')

    } catch (error) {
      req.flash('error', messages.user_update_error)
      res.redirect('/')
    }
  }

  async updateUserByAdmin(req, res) {
    const { id } = req.params
    try {
      await userModel.findByIdAndUpdate(id, req.body)
      req.flash('message', messages.user_updated)
      res.redirect('/user/profile/admin')
    } catch (error) {
      req.flash('error', messages.user_update_error)
      res.redirect('/user/profile/admin')
    }
  }

  async updateUserPassword(req, res, ) {
    const { user: id } = req.session.passport
    const { password } = req.body
    const user = await userModel.findByIdAndUpdate(id, { password })
    if (user) {
      req.flash('message', messages.user_updated)
      res.redirect('/user/profile/')
    } else {
      req.flash('error', messages.general_error)
      res.redirect('/user/profile/')
    }
  }

  async postRegister(req, res) {
    req.checkBody('name', 'Name should be greater than 5 characters').isLength(5)
    req.checkBody('name', 'Name cannot be empty').notEmpty()
    req.checkBody('email', 'Email is not valid').isEmail()
    req.checkBody('password', 'Password should be greater than 5 characters').isLength(5)
    req.checkBody('password', 'Password is show not be empty').notEmpty()

    if (req.validationErrors()) {
      req.flash('validationErrors', req.validationErrors())
      return res.redirect('/user/register')
    }

    passport.authenticate('signup', async (err, user, info) => {
      try {
        req.flash('message', info.message)
        return res.redirect('/')
      } catch (err) {
        req.flash('message', info.message)
        res.redirect('/user/register?' + user_register_err)
      }
    })(req, res)
  }

  async forgotPassword(req, res) {
    const { email } = req.body
    const user = await userModel.findOne({ email })
    const fullUrl = req.protocol + '://' + req.get('host');
    if (user) {
      const token = await jwt.sign({ email: user.email }, config.jwtSecret, { expiresIn: '1h' })
      const { id, name, email } = user
      await userModel.findByIdAndUpdate(id, { resetToken: token })

      const emailData = {
        to: email,
        subject: 'Reset Password',
        template: 'password-reset',
        locals: {
          name: name,
          link: `${fullUrl}/user/reset-password/${id}/${token}`
        }
      }
      emailController.send(emailData)
        .then(x => {
          console.log(x.text)
          req.flash('message', messages.passwordResetSuccess(user))
          res.redirect('/user/login')
        })
        .catch(x => {
          req.flash('error', x)
          console.log(x)
          res.redirect('/user/forgot-password')
        })
    }
  }

  async resetPassword(req, res) {
    const { password, new_password, id, token } = req.body

    req.checkBody('password', 'Password is show not be empty').notEmpty()
    req.checkBody('new_password', 'Password is show not be empty').notEmpty()
    req.checkBody('password', 'Password should be greater than 5 characters').isLength({ min: 5 })
    req.checkBody('password', 'Make ensure the passwords match').equals(new_password)
    const validationErrors = req.validationErrors()

    if (validationErrors) {
      req.flash('validationErrors', validationErrors)
      res.redirect('/user/login')
    }
    else {
      console.log({ id, token })
      const user = await userModel.findById(id)

      if (user.resetToken) {
        const isTokenValid = await jwt.verify(token, config.jwtSecret)
        if (isTokenValid) {
          await userModel.findOneAndUpdate({ password })
          req.flash('message', messages.password_reset_success)
          res.redirect('/user/login')
        }
        else {
          req.flash('error', messages.password_reset_fail)
          res.redirect('/user/login')
        }
      }
    }

  }

}




export default new UserController()