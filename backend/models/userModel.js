import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
        trim: true 
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: { 
        type: String, 
        default: null,
        validate: {
            validator: function(v) {
                return v === null || /^\+?[\d\s-]+$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    address: { 
        type: Object, 
        default: { 
            line1: '', 
            line2: '' 
        } 
    },
    gender: { 
        type: String, 
        enum: ['Male', 'Female', 'Other', 'Not Selected'],
        default: 'Not Selected' 
    },
    dob: { 
        type: String, 
        default: 'Not Selected' 
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationMethod: {
        type: String,
        enum: ['email', 'phone', null],
        default: null
    },
    verificationToken: {
        type: String,
        default: null
    },
    verificationTokenExpiry: {
        type: Date,
        default: null
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpiry: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true 
});

// Index for faster queries
userSchema.index({ email: 1 });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        this.password = await bcrypt.hash(this.password, 10);
         next();
    } catch (error) {
        next(error);
   }
 });

const userModel = mongoose.models.user || mongoose.model("user", userSchema);
export default userModel;