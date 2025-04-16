// src/lib/utils/socialFetch.ts

import { SocialProvider, type SocialProfile } from '@/types/socialAuth';

// Interface for provider-specific API handlers
interface SocialProviderHandler {
	fetchProfile(accessToken: string, redirectUri?: string): Promise<SocialProfile>;
}

/**
 * Fetch user profile from Google
 */
const googleProvider: SocialProviderHandler = {
	async fetchProfile(accessToken: string): Promise<SocialProfile> {
		const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!response.ok) {
			throw new Error(`Google API error: ${response.statusText}`, { cause: 401 });
		}

		const data = await response.json();

		return {
			id: data.sub,
			provider: SocialProvider.GOOGLE,
			providerId: data.sub,
			email: data.email,
			name: data.name,
			providerData: {
				email: data.email,
				email_verified: data.email_verified,
				name: data.name,
				picture: data.picture,
				given_name: data.given_name,
				family_name: data.family_name,
				locale: data.locale,
			},
		};
	},
};

/**
 * Fetch user profile from Facebook
 */
const facebookProvider: SocialProviderHandler = {
	async fetchProfile(accessToken: string): Promise<SocialProfile> {
		const fields = ['id', 'email', 'name', 'first_name', 'last_name', 'picture'].join(',');
		const response = await fetch(`https://graph.facebook.com/me?fields=${fields}&access_token=${accessToken}`);

		if (!response.ok) {
			throw new Error(`Facebook API error: ${response.statusText}`, { cause: 401 });
		}

		const data = await response.json();

		return {
			id: data.id,
			provider: SocialProvider.FACEBOOK,
			providerId: data.id,
			email: data.email,
			name: data.name,
			providerData: {
				email: data.email,
				name: data.name,
				first_name: data.first_name,
				last_name: data.last_name,
				picture: data.picture?.data?.url,
			},
		};
	},
};

/**
 * Fetch user profile from Discord
 */
const discordProvider: SocialProviderHandler = {
	async fetchProfile(accessToken: string): Promise<SocialProfile> {
		const response = await fetch('https://discord.com/api/users/@me', {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!response.ok) {
			throw new Error(`Discord API error: ${response.statusText}`, { cause: 401 });
		}

		const data = await response.json();
		const avatarUrl = data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : null;

		return {
			id: data.id,
			provider: SocialProvider.DISCORD,
			providerId: data.id,
			email: data.email,
			name: data.username,
			providerData: {
				id: data.id,
				username: data.username,
				discriminator: data.discriminator,
				avatar: avatarUrl,
				email: data.email,
				verified: data.verified,
				locale: data.locale,
				mfa_enabled: data.mfa_enabled,
				premium_type: data.premium_type,
			},
		};
	},
};

/**
 * Fetch user profile from GitHub
 */
const githubProvider: SocialProviderHandler = {
	async fetchProfile(accessToken: string): Promise<SocialProfile> {
		// Fetch user profile
		const userResponse = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `token ${accessToken}`,
				Accept: 'application/vnd.github.v3+json',
			},
		});

		if (!userResponse.ok) {
			throw new Error(`GitHub API error: ${userResponse.statusText}`, { cause: 401 });
		}

		const userData = await userResponse.json();

		// Fetch user emails (GitHub doesn't include email in user profile by default)
		const emailResponse = await fetch('https://api.github.com/user/emails', {
			headers: {
				Authorization: `token ${accessToken}`,
				Accept: 'application/vnd.github.v3+json',
			},
		});

		let primaryEmail = null;
		if (emailResponse.ok) {
			const emails = await emailResponse.json();
			const primary = emails.find((email: any) => email.primary);
			primaryEmail = primary ? primary.email : null;
		}

		return {
			id: userData.id.toString(),
			provider: SocialProvider.GITHUB,
			providerId: userData.id.toString(),
			email: primaryEmail || userData.email,
			name: userData.name || userData.login,
			providerData: {
				id: userData.id,
				login: userData.login,
				name: userData.name,
				avatar_url: userData.avatar_url,
				html_url: userData.html_url,
				bio: userData.bio,
				email: primaryEmail || userData.email,
				public_repos: userData.public_repos,
				followers: userData.followers,
				following: userData.following,
			},
		};
	},
};

// Map of provider handlers
const providerHandlers: Record<SocialProvider, SocialProviderHandler> = {
	[SocialProvider.GOOGLE]: googleProvider,
	[SocialProvider.FACEBOOK]: facebookProvider,
	[SocialProvider.DISCORD]: discordProvider,
	[SocialProvider.GITHUB]: githubProvider,
};

/**
 * Fetch profile from a social provider
 */
export async function fetchSocialProfile(
	provider: SocialProvider,
	accessToken: string,
	redirectUri?: string
): Promise<SocialProfile> {
	const handler = providerHandlers[provider];

	if (!handler) {
		throw new Error(`Unsupported social provider: ${provider}`, { cause: 401 });
	}

	return handler.fetchProfile(accessToken, redirectUri);
}
