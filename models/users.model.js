import db from 'mongoose'
import bcrypt from 'bcryptjs'
import moment from 'moment/moment'
const Schema = db.Schema

const userSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true
	},
	password: {
		type: String,
		required: String
	},
	created_at: {
		type: Date,
		default: Date.now
	},
	updated_at: {
		type: Date,
		default: Date.now
	},
	deleted: {
		type: Boolean,
		default: false
	},
	isActive: {
		type: Boolean,
		default: true
	},
	isConfirmed: {
		type: Boolean,
		default: false
	},
	isAdmin: {
		type: Boolean,
		default: false
	},
	comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }]
})

userSchema.pre('save', async function(next) {
	const hash = await bcrypt.hash(this.password, 10)
	this.password = hash
	next()
})

userSchema.pre('update', async function(next) {
	const hash = await bcrypt.hash(this.password, 10)
	if (this.password) {
		this.password = hash
	}
	this.updated_at = new Date()
	next()
})

userSchema.statics.isValidPassword = async function(password) {
	const user = this
	const compare = await bcrypt.compare(password, user.password)
	return compare
}
userSchema.pre('findOne', async function(next) {
	this.created_at = moment(this.created_at, 'YYYYMMDD').fromNow()
	this.updated_at = moment(this.updated_at, 'YYYYMMDD').fromNow()
})

export default db.model('users', userSchema)
